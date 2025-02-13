import * as core from "@actions/core";
import * as github from "@actions/github";

try {
  const sourceBranch = core.getInput("source-branch");
  // check if sb exists
  const targetBranch = core.getInput("target-branch");
  // check if tb exists
  const version = core.getInput("version");
  // check if version is gt latest tag on sb or tb

  console.log({
    sourceBranch,
    targetBranch,
    version
  });

  core.info("Run code");
} catch (error: unknown) {
  core.setFailed((error as Error).message);
}
