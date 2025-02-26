import * as exec from "@actions/exec";
import * as github from "@actions/github";
import { coerce, inc, type ReleaseType, type SemVer, valid } from "semver";

import type { GitHub } from "@actions/github/lib/utils";

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

  if (compareCommits.status !== "ahead") {
    throw new Error(
      `The '${head}' branch is not ahead of '${base}' branch. Rebase the '${head}' branch first.`
    );
  }
};

export const getLatestTagNames = async (
  octokit: InstanceType<typeof GitHub>,
  releaseType: ReleaseType
): Promise<[string, string]> => {
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

  if (!latestTagName || !valid(latestTagName)) {
    throw new Error("Latest tag version is not valid, check git tags");
  }

  const nextTagName = inc(coerce(latestTagName) as SemVer, releaseType) as string;

  if (!nextTagName) {
    throw new Error("Failed creating new tag");
  }

  return [latestTagName, `v${nextTagName}`];
};

export const createTag = async (
  octokit: InstanceType<typeof GitHub>,
  tag: string,
  commitSha: string
): Promise<void> => {
  const {
    owner,
    repo
  } = github.context.repo;

  const {
    data: newTag,
  } = await octokit.rest.git.createTag({
    owner,
    repo,
    tag,
    message: "",
    object: commitSha,
    type: "commit"
  });

  await octokit.rest.git.createRef({
    owner,
    repo,
    ref: `refs/tags/${tag}`,
    sha: newTag.sha
  });
};

export const syncBranches = async (
  base: string,
  head: string
): Promise<void> => {
  // no exising api for --no-ff merge
  await exec.exec("git", ["fetch", "-q"]);
  // need to populate targetBranch in local context
  await exec.exec("git", ["checkout", base, "-q"]);
  await exec.exec("git", ["checkout", head, "-q"]);
  await exec.exec("git", ["merge", base, "--ff", "-q"]);
  await exec.exec("git", ["push", "origin", "-f", "-q"]);
};
