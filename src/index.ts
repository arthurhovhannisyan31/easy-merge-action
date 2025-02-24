import * as core from "@actions/core";
import * as github from "@actions/github";
import {
  type ReleaseType,
} from "semver";

import { getNextTagVersion, validateBranchesMerge } from "./helpers";

// merge action returns created tag value
// release action creates a release with commits from prev to current tag
// notification action pushes the link to created release to slack

try {
  const PAT = process.env.PAT;

  if (!PAT) {
    throw new Error("Failed reading access token");
  }

  const sourceBranchName = core.getInput("source_branch", { required: true });
  const targetBranchName = core.getInput("target_branch", { required: true });
  const releaseType = core.getInput("release_type", { required: true }) as ReleaseType;

  const octokit = github.getOctokit(PAT);

  const repo = github.context.payload.repository?.name ?? "";
  const owner = github.context.payload.repository?.owner?.login ?? "";

  if (!repo || !owner) {
    throw new Error("Failed reading repository context");
  }

  // TODO Allow to run for maintainers and admins only
  // TODO Check if admin github.context.payload.repository?.sender?.type === 'admin' | 'maintainer'

  await validateBranchesMerge(
    octokit,
    owner,
    repo,
    sourceBranchName,
    targetBranchName,
  );

  const {
    data: targetBranch
  } = await octokit.rest.repos.getBranch({
    owner,
    repo,
    branch: targetBranchName
  });

  const {
    data: sourceBranch
  } = await octokit.rest.repos.getBranch({
    owner,
    repo,
    branch: sourceBranchName
  });

  console.log({
    targetBranch,
    sourceBranch
  });

  const nextTagVersion = await getNextTagVersion(
    octokit,
    owner,
    repo,
    sourceBranch.commit.sha,
    releaseType
  );

  // merge branches
  // dev -> master, master -> dev

  // at last
  core.setOutput("released_tag", nextTagVersion);

  // create release - separate action
  // post message to slack - separate action
} catch (error: unknown) {
  core.setFailed((error as Error).message);
}
