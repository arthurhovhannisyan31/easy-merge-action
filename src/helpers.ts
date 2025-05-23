import * as core from "@actions/core";
import * as exec from "@actions/exec";
import * as github from "@actions/github";
import { coerce, inc, type ReleaseType, type SemVer, valid } from "semver";

import { DEFAULT_VERSION } from "./constants";

import type {
  GitTag,
} from "./types";
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

  core.info("✔ Branches are valid for merge");
};

export const getNextTagVersion = async (
  octokit: InstanceType<typeof GitHub>,
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

  const latestTagVersion = latestTag?.name ?? DEFAULT_VERSION;

  if (!valid(latestTagVersion)) {
    throw new Error("Latest tag version is not valid, check git tags");
  }

  const nextTagVersion = inc(coerce(latestTagVersion) as SemVer, releaseType) as string;

  if (!nextTagVersion) {
    throw new Error("Failed creating new tag");
  }

  core.info(`✔ Next tag version created: ${nextTagVersion}`);

  return nextTagVersion;
};

export const createTag = async (
  octokit: InstanceType<typeof GitHub>,
  tag: string,
  commitSha: string
): Promise<GitTag> => {
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

  return newTag;
};

export const syncBranches = async (
  base: string,
  head: string
): Promise<void> => {
  // no existing api for --no-ff merge
  await exec.exec("git", ["fetch", "-q"]);
  // need to populate targetBranch in local context
  await exec.exec("git", ["checkout", base, "-q"]);
  await exec.exec("git", ["checkout", head, "-q"]);
  await exec.exec("git", ["merge", base, "--ff", "-q"]);
  await exec.exec("git", ["push", "origin", "-f", "-q"]);
};

export const processMerge = async (
  octokit: InstanceType<typeof GitHub>,
  base: string,
  head: string,
  tagVersion: string
): Promise<void> => {
  const {
    owner,
    repo
  } = github.context.repo;

  const {
    data: mergeCommit
  } = await octokit.rest.repos.merge({
    owner,
    repo,
    base,
    head,
    commit_message: `Release v${tagVersion}`
  });
  core.info(`✔ Branches '${base}' and '${head}' are merged`);

  await createTag(
    octokit,
    `v${tagVersion}`,
    mergeCommit.sha
  );
  core.info(`✔ Tag v${tagVersion} assigned to merge commit`);

  await syncBranches(
    base,
    head
  );
  core.info(`✔ Branch '${head}' is synced with '${base}'`);
};
