import * as github from "@actions/github";
import { coerce, inc, type ReleaseType, type SemVer, valid } from "semver";

import type { GitHub } from "@actions/github/lib/utils";
import type {
  RestEndpointMethodTypes
} from "@octokit/plugin-rest-endpoint-methods/dist-types/generated/parameters-and-response-types";

export const validateBranchesMerge = async (
  octokit: InstanceType<typeof GitHub>,
  base: string,
  head: string
): Promise<void> => {
  const {
    owner,
    repo
  } = github.context.repo;
  const compareCommitsResponse = await octokit.rest.repos.compareCommits({
    owner,
    repo,
    base,
    head,
  });

  /* Merge validation */
  if (compareCommitsResponse.data.status !== "behind") {
    throw new Error(`${base} branch is not behind ${head}`);
  }
};

export const getNextTagVersion = async (
  octokit: InstanceType<typeof GitHub>,
  branch: RestEndpointMethodTypes["repos"]["getBranch"]["response"]["data"],
  releaseType: ReleaseType
): Promise<string> => {
  const {
    owner,
    repo
  } = github.context.repo;
  const {
    data: tagsList
  } = await octokit.rest.repos.listTags({
    owner,
    repo,
  });
  const latestTag = tagsList?.[0];

  const latestTagVersion = latestTag?.name;

  if (!valid(latestTagVersion)) {
    throw new Error("Latest tag version is not valid, check git tags");
  }

  let nextTagVersion = latestTagVersion;

  const isLatestTagAtSourceHead = branch.commit.sha === latestTag.commit.sha;

  if (!isLatestTagAtSourceHead) {
    nextTagVersion = inc(coerce(latestTagVersion) as SemVer, releaseType) as string;

    if (!nextTagVersion) {
      throw new Error("Failed creating new tag");
    }

    nextTagVersion = `v${nextTagVersion}`;

    const {
      data: newTag,
    } = await octokit.rest.git.createTag({
      owner,
      repo,
      tag: nextTagVersion,
      message: "",
      object: branch.commit.sha,
      type: "commit"
    });

    await octokit.rest.git.createRef({
      owner,
      repo,
      ref: `refs/tags/${nextTagVersion}`,
      sha: newTag.sha
    });
  }

  return nextTagVersion;
};
