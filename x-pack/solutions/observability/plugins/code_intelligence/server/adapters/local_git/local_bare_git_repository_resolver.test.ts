/**
 * @jest-environment node
 */

/* eslint-disable @kbn/eslint/require-license-header */
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { LocalBareGitRepositoryResolver } from './local_bare_git';

const git = (args: readonly string[], input = ''): string =>
  execFileSync(
    'git',
    [
      '-c',
      'user.name=Test',
      '-c',
      'user.email=test@example.com',
      '-c',
      'core.hooksPath=/dev/null',
      ...args,
    ],
    { encoding: 'utf8', input, stdio: ['pipe', 'pipe', 'pipe'] }
  ).trim();

describe('LocalBareGitRepositoryResolver revision resolution', () => {
  let root: string;
  let bareRepositoryPath: string;
  let remotePath: string;
  let defaultBranchSha: string;
  let emptyTreeSha: string;
  let resolver: LocalBareGitRepositoryResolver;

  beforeAll(() => {
    root = mkdtempSync(join(tmpdir(), 'code-intelligence-resolver-'));
    remotePath = join(root, 'remote');
    bareRepositoryPath = join(root, 'mirror.git');
    git(['init', '--quiet', '--initial-branch=trunk', remotePath]);
    git(['-C', remotePath, 'commit', '--quiet', '--allow-empty', '-m', 'default branch']);
    defaultBranchSha = git(['-C', remotePath, 'rev-parse', 'HEAD']);
    git(['-C', remotePath, 'checkout', '--quiet', '-b', 'feature']);
    git(['-C', remotePath, 'commit', '--quiet', '--allow-empty', '-m', 'feature branch']);
    git(['-C', remotePath, 'checkout', '--quiet', 'trunk']);
    git(['init', '--quiet', '--bare', '--initial-branch=main', bareRepositoryPath]);
    git(['--git-dir', bareRepositoryPath, 'remote', 'add', 'origin', remotePath]);
    emptyTreeSha = git(['--git-dir', bareRepositoryPath, 'mktree']);
    resolver = new LocalBareGitRepositoryResolver({
      cursorSecret: 'a'.repeat(32),
      repositories: [
        {
          repository: 'elastic/example',
          bareRepositoryPath,
          remoteName: 'origin',
          expectedRemoteUrl: remotePath,
        },
      ],
    });
  });

  afterAll(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it('resolves HEAD to the remote default branch, not the bare repository HEAD', async () => {
    const localOnlySha = git([
      '--git-dir',
      bareRepositoryPath,
      'commit-tree',
      emptyTreeSha,
      '-m',
      'local only',
    ]);
    git(['--git-dir', bareRepositoryPath, 'update-ref', 'refs/heads/main', localOnlySha]);

    await expect(
      resolver.resolve({ repository: 'elastic/example', revision: 'HEAD' })
    ).resolves.toEqual({
      status: 'success',
      value: {
        commitSha: defaultBranchSha,
        repository: 'elastic/example',
        requestedRevision: 'HEAD',
      },
    });
  });

  it('follows the remote when its default branch moves', async () => {
    git(['-C', remotePath, 'checkout', '--quiet', 'feature']);
    try {
      const featureSha = git(['-C', remotePath, 'rev-parse', 'feature']);
      const result = await resolver.resolve({ repository: 'elastic/example', revision: 'HEAD' });
      expect(result).toMatchObject({ status: 'success', value: { commitSha: featureSha } });
    } finally {
      git(['-C', remotePath, 'checkout', '--quiet', 'trunk']);
    }
  });

  it('keeps other revisions resolvable when the remote HEAD is unborn', async () => {
    git(['-C', remotePath, 'symbolic-ref', 'HEAD', 'refs/heads/missing']);
    try {
      await expect(
        resolver.resolve({ repository: 'elastic/example', revision: 'trunk' })
      ).resolves.toMatchObject({ status: 'success', value: { commitSha: defaultBranchSha } });
      await expect(
        resolver.resolve({ repository: 'elastic/example', revision: 'HEAD' })
      ).resolves.toMatchObject({ status: 'failure' });
    } finally {
      git(['-C', remotePath, 'symbolic-ref', 'HEAD', 'refs/heads/trunk']);
    }
  });

  it('rejects local heads and commits outside the owned namespace', async () => {
    const localOnlySha = git([
      '--git-dir',
      bareRepositoryPath,
      'commit-tree',
      emptyTreeSha,
      '-m',
      'local branch only',
    ]);
    git(['--git-dir', bareRepositoryPath, 'update-ref', 'refs/heads/local-only', localOnlySha]);
    const notFound = {
      status: 'failure',
      error: {
        code: 'revision_not_found',
        message: 'Requested repository revision is unavailable.',
        retryable: false,
      },
    };

    await expect(
      resolver.resolve({ repository: 'elastic/example', revision: 'local-only' })
    ).resolves.toEqual(notFound);
    await expect(
      resolver.resolve({ repository: 'elastic/example', revision: 'refs/heads/local-only' })
    ).resolves.toEqual(notFound);
    await expect(
      resolver.resolve({ repository: 'elastic/example', revision: localOnlySha })
    ).resolves.toEqual(notFound);
  });
});
