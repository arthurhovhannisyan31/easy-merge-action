# Easy merge action

## Description

Action helps to run basic validation rules on branches and does merge for branches. A semantic 
versioned tag is assigned to merge commit.

## Inputs
`source_branch` - the branch with features (required).

`target_branch` - the base branch (required).

`release_type` - semantic release type for tag versioning (required).

## Secrets
Action uses `GITHUB_TOKEN` which should be provided as an environment variable.

## Usage
Please see the [release workflow](.github/workflows/release.yml) as a usage example.
