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

  // `who-to-greet` input defined in action metadata file
  const nameToGreet = core.getInput("who-to-greet");
  console.log(`Hello ${nameToGreet}!`);
  const time = (new Date()).toTimeString();
  core.setOutput("time", time);
  // Get the JSON webhook payload for the event that triggered the workflow
  const payload = JSON.stringify(github.context.payload, undefined, 2);
  console.log(`The event payload: ${payload}`);
} catch (error: unknown) {
  core.setFailed((error as Error).message);
}
