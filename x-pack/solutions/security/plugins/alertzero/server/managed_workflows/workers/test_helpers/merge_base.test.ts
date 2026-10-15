/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readTestHelperFileAt, resolveBaseCommit, type GitRunner } from './merge_base';

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
      /has no GITHUB_PR_MERGE_BASE/
    );
  });

  it('uses the merge base of a merge-queue build', () => {
    const git = fakeGit({ 'cat-file -e def^{commit}': '' });
    expect(
      resolveBaseCommit({ MERGE_QUEUE_TARGET_BRANCH: 'main', MERGE_QUEUE_MERGE_BASE: 'def' }, git)
    ).toBe('def');
  });

  it('fails a merge-queue build that has no merge base', () => {
    expect(() => resolveBaseCommit({ MERGE_QUEUE_TARGET_BRANCH: 'main' }, fakeGit({}))).toThrow(
      /has no MERGE_QUEUE_MERGE_BASE/
    );
  });

  it('skips the comparison on other CI builds', () => {
    const git = fakeGit({
      'merge-base HEAD origin/main': 'head',
      'rev-list --count head..HEAD': '0',
    });
    expect(resolveBaseCommit({ BUILDKITE: 'true' }, git)).toBeUndefined();
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

describe('readTestHelperFileAt', () => {
  it('returns undefined when the file did not exist at the commit', () => {
    expect(readTestHelperFileAt('abc', 'a.json', fakeGit({}))).toBeUndefined();
  });

  it('returns the file contents at the commit', () => {
    const git = fakeGit({ 'cat-file -e abc:./a.json': '', 'show abc:./a.json': '{}' });
    expect(readTestHelperFileAt('abc', 'a.json', git)).toBe('{}');
  });

  it('throws instead of skipping when git fails on a file that exists', () => {
    const git = fakeGit({ 'cat-file -e abc:./a.json': '' });
    expect(() => readTestHelperFileAt('abc', 'a.json', git)).toThrow(
      /git show abc:\.\/a\.json failed/
    );
  });
});
