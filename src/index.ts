import * as core from "@actions/core";
import * as exec from "@actions/exec";
import * as github from "@actions/github";
import {
  type ReleaseType,
} from "semver";

import { getTagVersions, validateBranchesMerge } from "./helpers";

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

  console.log(github.context.payload.sender);

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

  const tagName = await getTagVersions(
    octokit,
    sourceBranch,
    releaseType
  );

  core.setOutput("released_tag", tagName);

  await octokit.rest.repos.merge({
    owner,
    repo,
    base: targetBranchName,
    head: sourceBranchName,
    commit_message: `Release ${tagName}`
  });

  // no exising api for --no-ff merge
  await exec.exec("git", ["fetch", "-q"]);
  // need to populate targetBranch in local context
  await exec.exec("git", ["checkout", targetBranchName, "-q"]);
  await exec.exec("git", ["checkout", sourceBranchName, "-q"]);
  await exec.exec("git", ["merge", targetBranchName, "--ff", "-q"]);
  await exec.exec("git", ["push", "origin", "-f", "-q"]);

  // TODO try to rebase existing PRs

  /* create a release */
  const {
    data: releaseNotes
  } = await octokit.rest.repos.generateReleaseNotes({
    owner,
    repo,
    tag_name: tagName,
  });

  console.log(releaseNotes);

  // const {
  //   data: release
  // } = await octokit.rest.repos.createRelease({
  //   owner,
  //   repo,
  //   tag_name: tagName,
  //   releaseNotes
  // });
  //
  // console.log(release);

  // post message to slack - separate action
} catch (error: unknown) {
  core.setFailed((error as Error).message);
}
