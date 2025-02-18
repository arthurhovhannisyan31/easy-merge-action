import * as core from "@actions/core";
import * as github from "@actions/github";
import { inc, valid, parse, coerce } from "semver";

import { DEFAULT_VERSION, OWNER, REPO } from "./constants";

try {
  const sourceBranch = core.getInput("source-branch");
  const targetBranch = core.getInput("target-branch");
  const releaseType = core.getInput("release-type");
  const PAT = core.getInput("pat");
  const octokit = github.getOctokit(PAT);

  console.log({
    sourceBranch,
    targetBranch,
    releaseType
  });

  /* Version validation */

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
  const latestVersion = latestTag?.name ?? DEFAULT_VERSION;
  console.log({
    latestVersion,
    releaseType
  });

  const coercedVersion = coerce(latestVersion);
  const isVersionValid = valid(latestVersion);
  const parsedVersion = parse(latestVersion);
  console.log({
    coercedVersion,
    isVersionValid,
    parsedVersion
  });
  if (isVersionValid) {
    console.log({
      nextMajor: inc(latestVersion, "major"),
      nextMinor: inc(latestVersion, "minor"),
      nextPatch: inc(latestVersion, "patch"),
    });
  }

  if (!isVersionValid) {
    core.setFailed("Latest tag version is not valid, check git tags");
  }

  /* Branch validation */

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
  const compare = octokit.rest.repos.compareCommits({
    owner: OWNER,
    repo: REPO,
    base: sourceBranch,
    head: targetBranch,
  });

  // get tag for a commit sha
  console.log({
    compare
  });
} catch (error: unknown) {
  core.setFailed((error as Error).message);
}
