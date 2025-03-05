import * as core from "@actions/core";
import * as github from "@actions/github";

import {
  getNextTagName,
  processMerge,
  validateBranchesMerge
} from "./helpers";

import type {
  ReleaseType,
} from "semver";

try {
  const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

  if (!GITHUB_TOKEN) {
    throw new Error("Failed reading access token");
  }

  const sourceBranchName = core.getInput("source_branch", { required: true });
  const targetBranchName = core.getInput("target_branch", { required: true });
  const releaseType = core.getInput("release_type", { required: true }) as ReleaseType;

  const octokit = github.getOctokit(GITHUB_TOKEN);

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
  // notice branches are ok

  const tagName = await getNextTagName(
    octokit,
    releaseType
  );
  // notice created tag

  await processMerge(
    octokit,
    targetBranchName,
    sourceBranchName,
    tagName
  );

  core.setOutput("release_tag", tagName);
} catch (error: unknown) {
  core.setFailed((error as Error).message);
}
