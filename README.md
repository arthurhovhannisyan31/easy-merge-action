# Easy merge action

## Description

Action runs basic validation rules for branches and merges them with a semantic
versioned tag.

## Inputs
`source_branch` - the branch with features (required).

`target_branch` - the base branch (required).

`release_type` - semantic release type for tag versioning (required).

## Env
`GITHUB_TOKEN` - automatically generated token for workflow.

## Flow

1. Ensure that branches can be merged and `target_branch` is created from and ahead of 
   `source_branch`.
2. Generate `next tag name` using either latest tag or default tag name. Net tag name is 
   incremented according to provided `release_type`.
3. Merge `target_branch` into `source_branch` creating merge commit. 
4. Set `next tag name` to created merge commit.
5. Synchronize `target_branch` with `source_branch`.

That's simple!

## Usage
Please see the [release workflow](.github/workflows/release.yml) as a usage example.
