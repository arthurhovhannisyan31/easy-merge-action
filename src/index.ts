import * as core from "@actions/core";
import * as github from "@actions/github";
import {
  type ReleaseType,
} from "semver";

import {
  createRelease,
  createTag,
  getTagsData,
  syncBranches,
  validateBranchesMerge
} from "./helpers";

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

  const [previousTag, tagName] = await getTagsData(
    octokit,
    releaseType
  );

  const {
    data: mergeCommit
  } = await octokit.rest.repos.merge({
    owner,
    repo,
    base: targetBranchName,
    head: sourceBranchName,
    commit_message: `Release ${tagName}`
  });

  await createTag(
    octokit,
    tagName,
    mergeCommit.sha
  );

  await syncBranches(
    targetBranchName,
    sourceBranchName
  );

  const release = await createRelease(
    octokit,
    sourceBranchName,
    previousTag,
    tagName
  );

  core.setOutput("release_tag", tagName);
  core.setOutput("release_url", release.html_url);

  // post message to slack - separate action
} catch (error: unknown) {
  core.setFailed((error as Error).message);
}
