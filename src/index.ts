import * as core from "@actions/core";
import * as github from "@actions/github";

import { OWNER, REPO } from "./constants";

try {
  const sourceBranch = core.getInput("source-branch");
  const targetBranch = core.getInput("target-branch");
  const version = core.getInput("version");
  const PAT = core.getInput("pat");

  console.log({
    sourceBranch,
    targetBranch,
    version
  });

  core.info("Run code");

  const octokit = github.getOctokit(PAT);

  const {
    data: tagsList
  } = await octokit.rest.repos.listTags({
    owner: OWNER,
    repo: REPO
  });
  const latestTag = tagsList[0];
  console.log({
    latestTag
  });
  console.log("compare", latestTag.name, version);
  // parse tags
  // validate provided version
  // check if provided version is not at latest tag

  const latestRelease = octokit.rest.repos.getLatestRelease({
    owner: OWNER,
    repo: REPO
  });

  console.log({
    latestRelease
  });

  const {
    data: mainBranch
  } = await octokit.rest.repos.getBranch({
    owner: OWNER,
    repo: REPO,
    branch: "main"
  });
  const {
    data: devBranch
  } = await octokit.rest.repos.getBranch({
    owner: OWNER,
    repo: REPO,
    branch: "develop"
  });

  console.log({
    mainBranch,
    devBranch
  });
  // get tag for a commit sha
} catch (error: unknown) {
  core.setFailed((error as Error).message);
}
