import * as core from "@actions/core";
import * as github from "@actions/github";
import {
  coerce,
  inc,
  type ReleaseType,
  type SemVer,
  valid
} from "semver";

import { DEFAULT_VERSION } from "./constants";

// merge action returns created tag value
// release action creates a release with commits from prev to current tag
// notification action pushes the link to created release to slack

try {
  console.log(process.env.PAT);

  const pat = core.getInput("pat", { required: true });
  const sourceBranchName = core.getInput("source_branch", { required: true });
  const targetBranchName = core.getInput("target_branch", { required: true });
  const releaseType = core.getInput("release_type", { required: true }) as ReleaseType;

  const octokit = github.getOctokit(pat);

  const repo = github.context.payload.repository?.name ?? "";
  const owner = github.context.payload.repository?.owner?.login ?? "";

  if (!repo || !owner) {
    throw new Error("Failed reading repository context");
  }

  // TODO Allow to run for maintainers and admins only
  // TODO Check if admin github.context.payload.repository?.sender?.type === 'admin' | 'maintainer'

  /* Branch validation */
  const {
    data: targetBranch
  } = await octokit.rest.repos.getBranch({
    owner,
    repo,
    branch: targetBranchName
  });
  const {
    data: sourceBranch
  } = await octokit.rest.repos.getBranch({
    owner,
    repo,
    branch: sourceBranchName
  });

  console.log({
    targetBranch,
    sourceBranch
  });

  const compareCommitsResponse = await octokit.rest.repos.compareCommits({
    owner,
    repo,
    base: sourceBranchName,
    head: targetBranchName,
  });

  /* Merge validation */
  if (compareCommitsResponse.data.status !== "behind") {
    throw new Error(`${targetBranchName} branch is not behind ${sourceBranchName}`);
  }

  // if not tag create one
  // if tag check if it on the source branch head
  // if tag is not on source branch head create a new one

  /* Version validation */
  const {
    data: tagsList
  } = await octokit.rest.repos.listTags({
    owner,
    repo
  });
  const latestTag = tagsList?.[0];
  console.log({
    latestTag
  });
  // if no latest tag create one

  const latestTagName = latestTag?.name;

  if (!valid(latestTagName)) {
    throw new Error("Latest tag version is not valid, check git tags");
  }

  const nextTag = inc(coerce(latestTagName) as SemVer, releaseType);

  if (!nextTag) {
    throw new Error("Failed creating new tag");
  }

  console.log({
    nextTag
  });

  // if (latestTag.commit.sha === sourceBranch.commit.sha) {
  //   throw new Error(`Source branch already has a tag`);
  // }
  // get tag for a commit sha
  //
  console.log(compareCommitsResponse);

  // merge
  // create release
  // post message to slack
} catch (error: unknown) {
  core.setFailed((error as Error).message);
}
