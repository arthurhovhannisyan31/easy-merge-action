import * as core from "@actions/core";
import * as github from "@actions/github";

import {
  getNextTagVersion,
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

  await validateBranchesMerge(
    octokit,
    targetBranchName,
    sourceBranchName,
  );

  const tagVersion = await getNextTagVersion(
    octokit,
    releaseType
  );

  await processMerge(
    octokit,
    targetBranchName,
    sourceBranchName,
    tagVersion
  );

  core.setOutput("release_tag", `v${tagVersion}`);
} catch (error: unknown) {
  core.setFailed(`⚠️ ${(error as Error).message}`);
}

// 1
