import * as exec from "@actions/exec";
import * as github from "@actions/github";
import { coerce, inc, type ReleaseType, type SemVer, valid } from "semver";

import type { GitHub } from "@actions/github/lib/utils";
import type { components } from "@octokit/openapi-types";

type GitTag = components["schemas"]["git-tag"];
type Tag = components["schemas"]["tag"];
type Release = components["schemas"]["release"];

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

export const getTagsData = async (
  octokit: InstanceType<typeof GitHub>,
  releaseType: ReleaseType
): Promise<[Tag, string]> => {
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

  return [latestTag, `v${nextTagName}`];
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
  // no exising api for --no-ff merge
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
  tagName: string
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
    commit_message: `Release ${tagName}`
  });

  await createTag(
    octokit,
    tagName,
    mergeCommit.sha
  );

  await syncBranches(
    base,
    head
  );
};

export const createRelease = async (
  octokit: InstanceType<typeof GitHub>,
  sourceBranchName: string,
  previousTag: Tag,
  tagName: string
): Promise<Release> => {
  const {
    owner,
    repo
  } = github.context.repo;
  const {
    data: commits
  } = await octokit.rest.repos.listCommits({
    owner,
    repo,
    sha: sourceBranchName
  });

  const previousTagIndex = commits.findIndex(({
    sha
  }) => sha === previousTag.commit.sha);
  if (!Number.isFinite(previousTagIndex)) {
    throw new Error("Failed creating release. add more details");
  }
  /* Filter out merge commits from edges */
  const filteredCommits = commits.slice(1, previousTagIndex);

  const commitsNotes = filteredCommits.map(({
    commit,
    author
  }) => `${author?.login} ${commit.message}`).join("\n");

  const {
    data: releaseNotes
  } = await octokit.rest.repos.generateReleaseNotes({
    owner,
    repo,
    tag_name: tagName,
  });

  const {
    data: release
  } = await octokit.rest.repos.createRelease({
    owner,
    repo,
    tag_name: tagName,
    name: `Release ${releaseNotes.name}`,
    body: `${commitsNotes}\n\n${releaseNotes.body}`
  });

  return release;
};
