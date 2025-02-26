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
  const {
    data: compareCommits
  } = await octokit.rest.repos.compareCommits({
    owner,
    repo,
    base,
    head,
  });

  /* Merge validation */
  if (compareCommits.status !== "ahead") {
    throw new Error(
      // eslint-disable-next-line max-len
      `The '${head}' branch is not ahead of '${base}' branch. \n Rebase the '${head}' branch first and check merge-conflicts.`
    );
  }
};

export const getTagVersions = async (
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

  const latestTagName = latestTag?.name;

  if (!valid(latestTagName)) {
    throw new Error("Latest tag version is not valid, check git tags");
  }

  let nextTagName = latestTagName;

  const isLatestTagAtSourceHead = branch.commit.sha === latestTag.commit.sha;

  if (!isLatestTagAtSourceHead) {
    nextTagName = inc(coerce(latestTagName) as SemVer, releaseType) as string;

    if (!nextTagName) {
      throw new Error("Failed creating new tag");
    }

    nextTagName = `v${nextTagName}`;

    const {
      data: newTag,
    } = await octokit.rest.git.createTag({
      owner,
      repo,
      tag: nextTagName,
      message: "",
      object: branch.commit.sha,
      type: "commit"
    });

    await octokit.rest.git.createRef({
      owner,
      repo,
      ref: `refs/tags/${nextTagName}`,
      sha: newTag.sha
    });
  }

  return nextTagName;
};
