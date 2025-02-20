import * as core from "@actions/core";
import * as github from "@actions/github";
import {
  coerce,
  inc,
  type ReleaseType,
  type SemVer,
  valid
} from "semver";

import { DEFAULT_VERSION } from "./constants";

try {
  const pat = core.getInput("pat");
  const sourceBranch = core.getInput("source_branch");
  const targetBranch = core.getInput("target_branch");
  const releaseType = core.getInput("release_type") as ReleaseType;

  const octokit = github.getOctokit(pat);

  const repo = github.context.payload.repository?.name ?? "";
  const owner = github.context.payload.repository?.owner?.login ?? "";

  if (!repo || !owner) {
    core.setFailed("Failed reading repository context");
  }

  // TODO Allow to run for maintainers and admins only
  // TODO Check if admin github.context.payload.repository?.sender?.type === 'admin' | 'maintainer'

  /* Version validation */
  const {
    data: tagsList
  } = await octokit.rest.repos.listTags({
    owner,
    repo
  });
  const latestTag = tagsList?.[0];
  const latestVersion = latestTag?.name ?? DEFAULT_VERSION;

  if (!valid(latestVersion)) {
    core.setFailed("Latest tag version is not valid, check git tags");
  }

  const nextVersion = inc(coerce(latestVersion) as SemVer, releaseType);

  console.log({
    nextVersion
  });

  /* Branch validation */
  const {
    data: targetBranchData
  } = await octokit.rest.repos.getBranch({
    owner,
    repo,
    branch: targetBranch
  });
  const {
    data: sourceBranchData
  } = await octokit.rest.repos.getBranch({
    owner,
    repo,
    branch: sourceBranch
  });

  // git merge-base
  // TODO check branches HEADs are not the same
  // TODO check source branch HEAD is ahead of target branch HEAD
  // TODO check source branch HEAD does not have tag

  console.log({
    targetBranchData,
    sourceBranchData
  });
  const compareCommitsResponse = await octokit.rest.repos.compareCommits({
    owner,
    repo,
    base: sourceBranch,
    head: targetBranch,
  });

  /* Merge validation */
  if (compareCommitsResponse.data.status !== "behind") {
    core.setFailed(`${targetBranch} branch is not behind ${sourceBranch}`);
  }

  console.log("should exit");

  // get tag for a commit sha
  console.log(compareCommitsResponse);
} catch (error: unknown) {
  core.setFailed((error as Error).message);
}
