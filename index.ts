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

  const PAT = core.getInput("pat");
  const octokit = github.getOctokit(PAT);

  const {
    data: tagsList
  } = await octokit.rest.repos.listTags({
    owner: "arthurhovhannisyan31", // me
    repo: "easy-release-action" // my repo
  });
  console.log({
    tagsList
  });
  const latestTag = tagsList[0].name;

  console.log("compare", latestTag, version);
  // parse tags
  // validate provided version
  // check if provided version is not at latest tag

  const {
    data: branch
  } = await octokit.rest.repos.getBranch({
    owner: "arthurhovhannisyan31",
    repo: "easy-release-action",
    branch: "main"
  });
  console.log({
    branch
  });
} catch (error: unknown) {
  core.setFailed((error as Error).message);
}
