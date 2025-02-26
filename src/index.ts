import * as core from "@actions/core";
import * as exec from "@actions/exec";
import * as github from "@actions/github";
import {
  type ReleaseType,
} from "semver";

import { getNextTagVersion, validateBranchesMerge } from "./helpers";

try {
  const PAT = process.env.PAT;

  if (!PAT) {
    throw new Error("Failed reading access token");
  }

  const sourceBranchName = core.getInput("source_branch", { required: true });
  const targetBranchName = core.getInput("target_branch", { required: true });
  const releaseType = core.getInput("release_type", { required: true }) as ReleaseType;

  const octokit = github.getOctokit(PAT);

  const {
    owner,
    repo
  } = github.context.repo;

  // TODO extract to helper
  // const senderType = github.context.payload.sender?.type ?? "User";
  //
  // if (!["maintainer", "admin"].includes(senderType)) {
  //   throw new Error("Forbidden: No sufficient rights to call this action");
  // }

  await validateBranchesMerge(
    octokit,
    targetBranchName,
    sourceBranchName,
  );

  const {
    data: sourceBranch
  } = await octokit.rest.repos.getBranch({
    owner,
    repo,
    branch: sourceBranchName
  });

  const nextTagVersion = await getNextTagVersion(
    octokit,
    sourceBranch,
    releaseType
  );

  core.setOutput("released_tag", nextTagVersion);

  await octokit.rest.repos.merge({
    owner,
    repo,
    base: targetBranchName,
    head: sourceBranchName,
    commit_message: `Release ${nextTagVersion}`
  });

  // no exising api for --no-ff merge
  await exec.exec("git", ["fetch"]);
  // need to populate targetBranch in local context
  await exec.exec("git", ["checkout", targetBranchName]);
  await exec.exec("git", ["checkout", sourceBranchName]);
  await exec.exec("git", ["merge", targetBranchName, "--ff"]);
  await exec.exec("git", ["push", "origin", "-f"]);

  // TODO try to rebase existing PRs

  // create release - separate action
  // post message to slack - separate action
} catch (error: unknown) {
  core.setFailed((error as Error).message);
}
