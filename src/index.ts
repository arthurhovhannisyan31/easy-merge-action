import * as core from "@actions/core";
import * as github from "@actions/github";

import { OWNER, REPO } from "./constants";

try {
  const sourceBranch = core.getInput("source-branch");
  const targetBranch = core.getInput("target-branch");
  const version = core.getInput("version");
  const PAT = core.getInput("pat");
  const octokit = github.getOctokit(PAT);

  console.log({
    sourceBranch,
    targetBranch,
    version
  });

  core.info("Run code");

  console.log({
    OWNER,
    REPO
  });

  const {
    data: tagsList
  } = await octokit.rest.repos.listTags({
    owner: OWNER,
    repo: REPO
  });
  const latestTag = tagsList?.[0];
  console.log({
    latestTag
  });
  console.log("compare", latestTag.name, version);

  // TODO check if version is gt latest tag on sb or tb
  const isNewVersionValid = true;

  if (!isNewVersionValid) {
    core.setFailed("Provided tag version is not valid");
  }

  // parse tags
  // validate provided version
  // check if provided version is not at latest tag

  // fails
  // const latestRelease = octokit.rest.repos.getLatestRelease({
  //   owner: OWNER,
  //   repo: REPO
  // });
  //
  // console.log({
  //   latestRelease
  // });

  const {
    data: mainBranch
  } = await octokit.rest.repos.getBranch({
    owner: OWNER,
    repo: REPO,
    branch: targetBranch
  });
  const {
    data: devBranch
  } = await octokit.rest.repos.getBranch({
    owner: OWNER,
    repo: REPO,
    branch: sourceBranch
  });

  /* validation */
  // TODO check if source and target can be merged: git merge-base --is-ancestor HEAD branch1
  // git merge-base
  // TODO check branches HEADs are not the same
  // TODO check source branch HEAD is ahead of target branch HEAD

  // TODO check source branch HEAD does not have tag

  console.log({
    mainBranch,
    devBranch
  });
  // get tag for a commit sha
} catch (error: unknown) {
  core.setFailed((error as Error).message);
}
