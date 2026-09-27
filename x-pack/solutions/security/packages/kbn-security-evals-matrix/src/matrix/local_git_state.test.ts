/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { execFileSync } from 'child_process';
import { ToolingLog } from '@kbn/tooling-log';
import { readLocalGitState } from './local_git_state';

jest.mock('child_process', () => ({ execFileSync: jest.fn() }));

// Cast needed: the typed signature resolves to the Buffer overload, but the source passes `encoding: 'utf8'`.
const execFileSyncMock = execFileSync as unknown as jest.Mock;

describe('readLocalGitState', () => {
  let log: ToolingLog;

  beforeEach(() => {
    jest.resetAllMocks();
    log = new ToolingLog({ level: 'silent', writeTo: process.stdout });
  });

  const mockGit = (responses: Record<string, string>) => {
    execFileSyncMock.mockImplementation((_cmd: string, args: string[]) => {
      const key = args.join(' ');
      if (!(key in responses)) {
        throw new Error(`unexpected git invocation: ${key}`);
      }
      return responses[key];
    });
  };

  it('reports the current sha and a clean tree', () => {
    mockGit({
      'rev-parse HEAD': 'abc123def456\n',
      'status --porcelain --untracked-files=no': '\n',
    });

    expect(readLocalGitState('/repo', log)).toEqual({ sha: 'abc123def456', dirty: false });
  });

  it('flags a tree with tracked modifications as dirty', () => {
    mockGit({
      'rev-parse HEAD': 'abc123\n',
      'status --porcelain --untracked-files=no': ' M src/matrix/render.ts\n',
    });

    expect(readLocalGitState('/repo', log)).toEqual({ sha: 'abc123', dirty: true });
  });

  it('ignores untracked files when deciding dirtiness', () => {
    mockGit({
      'rev-parse HEAD': 'abc123\n',
      'status --porcelain --untracked-files=no': '',
    });

    expect(readLocalGitState('/repo', log)).toEqual({ sha: 'abc123', dirty: false });
    expect(execFileSyncMock).toHaveBeenCalledWith(
      'git',
      ['status', '--porcelain', '--untracked-files=no'],
      expect.anything()
    );
  });

  it('runs git in the provided repo root', () => {
    mockGit({
      'rev-parse HEAD': 'abc123\n',
      'status --porcelain --untracked-files=no': '',
    });

    readLocalGitState('/some/worktree', log);

    expect(execFileSyncMock).toHaveBeenCalledWith(
      'git',
      expect.any(Array),
      expect.objectContaining({ cwd: '/some/worktree' })
    );
  });

  it('returns empty state instead of throwing when git is unavailable', () => {
    execFileSyncMock.mockImplementation(() => {
      throw new Error('git: command not found');
    });

    expect(readLocalGitState('/repo', log)).toEqual({});
  });

  it('returns empty state when the directory is not a git repository', () => {
    execFileSyncMock.mockImplementation(() => {
      throw new Error('fatal: not a git repository');
    });

    expect(() => readLocalGitState('/tmp/not-a-repo', log)).not.toThrow();
    expect(readLocalGitState('/tmp/not-a-repo', log)).toEqual({});
  });

  it('returns empty state when git fails with a non-Error value', () => {
    const nonError: unknown = 'string failure';
    execFileSyncMock.mockImplementation(() => {
      throw nonError;
    });

    expect(readLocalGitState('/repo', log)).toEqual({});
  });
});
