import { coerce, inc, type ReleaseType, type SemVer, valid } from "semver";

import type { GitHub } from "@actions/github/lib/utils";
import type {
  RestEndpointMethodTypes
} from "@octokit/plugin-rest-endpoint-methods/dist-types/generated/parameters-and-response-types";

export const validateBranchesMerge = async (
  octokit: InstanceType<typeof GitHub>,
  owner: string,
  repo: string,
  base: string,
  head: string
): Promise<void> => {
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
  owner: string,
  repo: string,
  branch: RestEndpointMethodTypes["repos"]["getBranch"]["response"]["data"],
  releaseType: ReleaseType
): Promise<string> => {
  const {
    data: tagsList
  } = await octokit.rest.repos.listTags({
    owner,
    repo,
  });
  const latestTag = tagsList?.[0];
  console.log({
    latestTag
  });

  const latestTagVersion = latestTag?.name;

  if (!valid(latestTagVersion)) {
    throw new Error("Latest tag version is not valid, check git tags");
  }

  let nextTagVersion = latestTagVersion;

  const isLatestTagAtSourceHead = branch.commit.sha === latestTag.commit.sha;

  console.log({
    isLatestTagAtSourceHead
  });

  if (!isLatestTagAtSourceHead) {
    nextTagVersion = inc(coerce(latestTagVersion) as SemVer, releaseType) as string;

    console.log({
      nextTagVersion
    });

    if (!nextTagVersion) {
      throw new Error("Failed creating new tag");
    }

    console.log({
      owner,
      repo,
      tag: `v${nextTagVersion}`,
      message: "",
      object: branch.commit.sha,
      type: "commit"
    });

    const {
      data: newTag,
    } = await octokit.rest.git.createTag({
      owner,
      repo,
      tag: `v${nextTagVersion}`,
      message: "",
      object: branch.commit.sha,
      type: "commit"
    });

    const {
      data: newTagRef
    } = await octokit.rest.git.createRef({
      owner,
      repo,
      ref: `refs/heads/${branch.name}`,
      sha: newTag.sha
    });

    console.log({
      newTag,
      newTagRef
    });
    nextTagVersion = newTag.tag;
  }

  return nextTagVersion;
};
