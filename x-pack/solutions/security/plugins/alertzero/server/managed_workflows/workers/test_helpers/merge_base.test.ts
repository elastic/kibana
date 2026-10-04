/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { resolveBaseCommit, type GitRunner } from './merge_base';

const fakeGit =
  (responses: Record<string, string | undefined>): GitRunner =>
  (args) =>
    responses[args.join(' ')];

describe('resolveBaseCommit', () => {
  it('uses the merge base Buildkite resolved for a PR', () => {
    const git = fakeGit({ 'cat-file -e abc^{commit}': '' });
    expect(resolveBaseCommit({ GITHUB_PR_MERGE_BASE: 'abc' }, git)).toBe('abc');
  });

  it('fails a PR build when the merge base commit is not in the checkout', () => {
    expect(() => resolveBaseCommit({ GITHUB_PR_MERGE_BASE: 'abc' }, fakeGit({}))).toThrow(
      /is not in this checkout/
    );
  });

  it('fails a PR build that has no merge base', () => {
    expect(() => resolveBaseCommit({ GITHUB_PR_NUMBER: '1' }, fakeGit({}))).toThrow(
      /without GITHUB_PR_MERGE_BASE/
    );
  });

  it('uses the nearest remote default branch locally', () => {
    const git = fakeGit({
      'for-each-ref --format=%(symref:short) refs/remotes/*/HEAD': 'origin/main\nupstream/main',
      'merge-base HEAD origin/main': 'stale',
      'rev-list --count stale..HEAD': '40',
      'merge-base HEAD upstream/main': 'fresh',
      'rev-list --count fresh..HEAD': '3',
    });
    expect(resolveBaseCommit({}, git)).toBe('fresh');
  });

  it('returns undefined locally when no remote branch resolves', () => {
    expect(resolveBaseCommit({}, fakeGit({}))).toBeUndefined();
  });
});
