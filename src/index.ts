import * as core from "@actions/core";
import * as github from "@actions/github";
import {
  coerce,
  inc,
  type ReleaseType,
  type SemVer,
  valid
} from "semver";

import { DEFAULT_VERSION, OWNER, REPO } from "./constants";

try {
  // TODO Allow to run for maintainers and admins only

  const sourceBranch = core.getInput("source_branch");
  const targetBranch = core.getInput("target_branch");
  const releaseType = core.getInput("release_type") as ReleaseType;
  const PAT = core.getInput("pat");
  const octokit = github.getOctokit(PAT);

  console.log({
    sourceBranch,
    targetBranch,
    releaseType
  });

  /* Version validation */
  const {
    data: tagsList
  } = await octokit.rest.repos.listTags({
    owner: OWNER,
    repo: REPO
  });
  const latestTag = tagsList?.[0];
  const latestVersion = latestTag?.name ?? DEFAULT_VERSION;

  console.log({
    latestTag,
    latestVersion,
  });

  console.log({
    nextMajor: inc(latestVersion, "major"),
    nextMinor: inc(latestVersion, "minor"),
    nextPatch: inc(latestVersion, "patch"),
  });

  if (!valid(latestVersion)) {
    core.setFailed("Latest tag version is not valid, check git tags");
  }

  const nextVersion = inc(coerce(latestVersion) as SemVer, releaseType);

  console.log({
    nextVersion
  });

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
  const compare = await octokit.rest.repos.compareCommits({
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
