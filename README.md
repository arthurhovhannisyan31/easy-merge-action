# Easy merge action

## Description

Action runs basic validation rules for branches and merges them with a semantic
versioned tag.

## Inputs
`source_branch` - the branch with features (required).

`target_branch` - the base branch (required).

`release_type` - semantic release type for tag versioning (required).

## Secrets
Action uses `GITHUB_TOKEN` which should be provided as an environment variable.

## Usage
Please see the [release workflow](.github/workflows/release.yml) as a usage example.
