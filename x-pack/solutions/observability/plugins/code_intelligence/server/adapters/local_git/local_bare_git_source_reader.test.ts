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
import { EventEmitter } from 'node:events';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PassThrough } from 'node:stream';

import type { PageResult, SourcePath } from '../../domain';
import { spawnGit } from './local_bare_git_helpers';
import { LocalBareGitSourceReader } from './local_bare_git_source_reader';

jest.mock('./local_bare_git_helpers', () => ({
  ...jest.requireActual('./local_bare_git_helpers'),
  spawnGit: jest.fn(),
}));

/** Stands in for one scan's Git child so each test decides when the scan ends. */
class FakeGitChild extends EventEmitter {
  public readonly stdout = new PassThrough();
  public readonly stderr = new PassThrough();
  public readonly pid = undefined;
  public kill = jest.fn();

  public finish(output: string, exitCode = 0): void {
    this.stdout.once('end', () => this.emit('close', exitCode));
    this.stderr.end();
    this.stdout.end(Buffer.from(output));
  }
}

const spawnGitMock = spawnGit as jest.MockedFunction<typeof spawnGit>;

const waitFor = async (predicate: () => boolean): Promise<void> => {
  for (let attempt = 0; attempt < 400; attempt += 1) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  throw new Error('Condition was not met in time.');
};

describe('LocalBareGitSourceReader scan concurrency', () => {
  let root: string;
  let bareRepositoryPath: string;
  let children: FakeGitChild[];

  const repository = {
    repository: 'elastic/example',
    commitSha: '0123456789abcdef0123456789abcdef01234567',
    requestedRevision: 'HEAD',
  };

  const createReader = (spoolSlotWaitMs: number) =>
    new LocalBareGitSourceReader({
      cursorSecret: 'a'.repeat(32),
      maxSpoolConcurrency: 2,
      spoolSlotWaitMs,
      spoolRootPath: join(root, 'spool'),
      repositories: [
        {
          repository: repository.repository,
          bareRepositoryPath,
          remoteName: 'origin',
          expectedRemoteUrl: 'https://github.com/elastic/example.git',
        },
      ],
    });

  const track = (result: Promise<PageResult<SourcePath>>) => {
    const tracked = { settled: false, result };
    void result.finally(() => {
      tracked.settled = true;
    });
    return tracked;
  };

  const complete = (path: string) => ({ status: 'complete', items: [{ path }] });

  /** Scans may reach Git in any order, so compare completed paths as a sorted list. */
  const completedPaths = (results: ReadonlyArray<PageResult<SourcePath>>) =>
    results
      .flatMap((result) =>
        result.status === 'failure' ? [] : result.items.map(({ path }) => path)
      )
      .sort();

  beforeAll(() => {
    root = mkdtempSync(join(tmpdir(), 'code-intelligence-reader-'));
    bareRepositoryPath = join(root, 'mirror.git');
    execFileSync('git', ['init', '--quiet', '--bare', bareRepositoryPath]);
    execFileSync('git', [
      '--git-dir',
      bareRepositoryPath,
      'remote',
      'add',
      'origin',
      'https://github.com/elastic/example.git',
    ]);
  });

  afterAll(() => {
    rmSync(root, { recursive: true, force: true });
  });

  beforeEach(() => {
    children = [];
    spawnGitMock.mockReset();
    spawnGitMock.mockImplementation(() => {
      const child = new FakeGitChild();
      children.push(child);
      return child as unknown as ReturnType<typeof spawnGit>;
    });
  });

  it('makes a third concurrent scan wait for a slot, then succeed', async () => {
    const reader = createReader(10_000);
    const scans = ['a', 'b', 'c'].map(() => track(reader.listSourcePage({ repository })));

    await waitFor(() => children.length === 2);
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(children).toHaveLength(2);
    expect(scans[2].settled).toBe(false);

    children[0].finish('a.txt\0');
    await waitFor(() => children.length === 3);
    children[1].finish('b.txt\0');
    children[2].finish('c.txt\0');

    const results = await Promise.all(scans.map(({ result }) => result));
    expect(results.every(({ status }) => status === 'complete')).toBe(true);
    expect(completedPaths(results)).toEqual(['a.txt', 'b.txt', 'c.txt']);
  });

  it('hands the slot of a failed Git scan to the waiting scan', async () => {
    const reader = createReader(10_000);
    const scans = ['a', 'b', 'c'].map(() => track(reader.listSourcePage({ repository })));

    await waitFor(() => children.length === 2);
    children[0].finish('', 128);
    await waitFor(() => children.length === 3);
    children[1].finish('b.txt\0');
    children[2].finish('c.txt\0');

    const results = await Promise.all(scans.map(({ result }) => result));
    expect(results.filter(({ status }) => status === 'failure')).toEqual([
      expect.objectContaining({ error: expect.objectContaining({ code: 'git_nonzero_exit' }) }),
    ]);
    expect(completedPaths(results)).toEqual(['b.txt', 'c.txt']);
  });

  it('returns spool_concurrency_exceeded when the bounded wait expires', async () => {
    const reader = createReader(50);
    const held = ['a', 'b'].map(() => track(reader.listSourcePage({ repository })));
    await waitFor(() => children.length === 2);

    await expect(reader.listSourcePage({ repository })).resolves.toEqual({
      status: 'failure',
      error: {
        code: 'spool_concurrency_exceeded',
        message: 'Too many Git source scans are active.',
        retryable: true,
      },
    });
    expect(children).toHaveLength(2);

    children[0].finish('a.txt\0');
    children[1].finish('b.txt\0');
    expect(completedPaths(await Promise.all(held.map(({ result }) => result)))).toEqual([
      'a.txt',
      'b.txt',
    ]);

    const after = reader.listSourcePage({ repository });
    await waitFor(() => children.length === 3);
    children[2].finish('d.txt\0');
    await expect(after).resolves.toEqual(complete('d.txt'));
  });
});
