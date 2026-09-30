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

import { execFile } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdtemp, mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';

import type { Logger } from '@kbn/core/server';
import type { RunCommandParams, RunCommandResult } from '@kbn/sandbox-plugin/server';

import type { ResolvedRepository } from '../../domain';
import type { SourceSession } from '../../source_session';
import { createSandboxGitSourceSession, type SandboxCommandRunner } from './sandbox_git';
import { githubTokenEnv } from './git_credentials_provider';
import { RESTORE_SCRIPT } from './sandbox_git_scripts';

const run = promisify(execFile);
const STDOUT_LIMIT = 4 * 1024 * 1024;
const TOKEN = 'ghp_test_secret_token_value_0123456789';
const repository = 'elastic/example';

type Hook = (params: RunCommandParams) => Promise<RunCommandResult | undefined>;

/** Runs sandbox commands through a real bash and enforces the gRPC 4 MiB response limit. */
class BashSandboxSession implements SandboxCommandRunner {
  public readonly commands: RunCommandParams[] = [];
  public readonly hooks: Hook[] = [];
  public maxStdoutBytes = 0;

  constructor(private readonly cwd: string) {}

  public async runCommand(params: RunCommandParams): Promise<RunCommandResult> {
    this.commands.push(params);
    const hook = this.hooks.shift();
    const hooked = hook === undefined ? undefined : await hook(params);
    if (hooked !== undefined) return hooked;
    const { stdout, stderr, exitCode } = await new Promise<{
      stdout: string;
      stderr: string;
      exitCode: number;
    }>((resolve) => {
      execFile(
        'bash',
        ['--noprofile', '--norc', '-c', params.command],
        {
          cwd: this.cwd,
          env: { PATH: process.env.PATH, HOME: this.cwd, ...params.env },
          maxBuffer: 64 * 1024 * 1024,
          encoding: 'utf8',
        },
        (error, out, err) =>
          resolve({
            stdout: out,
            stderr: err,
            exitCode:
              error === null ? 0 : typeof error.code === 'number' ? error.code : Number(error.code),
          })
      );
    });
    const bytes = Buffer.byteLength(stdout);
    this.maxStdoutBytes = Math.max(this.maxStdoutBytes, bytes);
    if (bytes > STDOUT_LIMIT)
      throw Object.assign(new Error('8 RESOURCE_EXHAUSTED: Received message larger than max'), {
        code: 8,
      });
    return { stdout, stderr, exit_code: exitCode, timed_out: false };
  }
}

const git = async (cwd: string, ...args: string[]): Promise<string> =>
  (
    await run('git', args, {
      cwd,
      env: {
        ...process.env,
        GIT_AUTHOR_NAME: 'Test',
        GIT_AUTHOR_EMAIL: 'test@example.com',
        GIT_COMMITTER_NAME: 'Test',
        GIT_COMMITTER_EMAIL: 'test@example.com',
        GIT_CONFIG_GLOBAL: '/dev/null',
        GIT_CONFIG_NOSYSTEM: '1',
      },
      maxBuffer: 64 * 1024 * 1024,
    })
  ).stdout.trim();

const commit = async (cwd: string, files: Record<string, string>, message: string) => {
  for (const [path, content] of Object.entries(files)) {
    await mkdir(join(cwd, path, '..'), { recursive: true });
    await writeFile(join(cwd, path), content);
  }
  await git(cwd, 'add', '-A');
  await git(cwd, 'commit', '-q', '-m', message);
  return git(cwd, 'rev-parse', 'HEAD');
};

let workDir: string;
let remoteDir: string;
let remoteUrl: string;
let firstSha: string;
let mainSha: string;
let featureSha: string;
let bigSha: string;
const bigMatches = 35_000;

const logger = (): jest.Mocked<Logger> =>
  ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    get: jest.fn(),
  } as unknown as jest.Mocked<Logger>);

const open = (
  options: {
    readonly pageSize?: number;
    readonly chunkBytes?: number;
    readonly log?: Logger;
  } = {}
): { session: BashSandboxSession; source: SourceSession; root: string } => {
  const session = new BashSandboxSession(workDir);
  const root = join(workDir, `pod-${randomUUID()}`, 'code-intelligence');
  const source = createSandboxGitSourceSession({
    session,
    repositories: [{ repository, remoteUrl }],
    credentials: { envFor: async () => githubTokenEnv(TOKEN) },
    cursorSecret: 'a-cursor-secret-of-sufficient-length',
    logger: options.log,
    rootPath: root,
    allowedProtocols: 'file',
    readerLimits: {
      ...(options.pageSize === undefined ? {} : { pageSize: options.pageSize }),
      ...(options.chunkBytes === undefined ? {} : { chunkBytes: options.chunkBytes }),
    },
  });
  return { session, source, root };
};

const resolved = async (source: SourceSession, revision = 'HEAD'): Promise<ResolvedRepository> => {
  const result = await source.repositoryResolver.resolve({ repository, revision });
  if (result.status !== 'success') throw new Error(`resolve failed: ${result.error.code}`);
  return result.value;
};

beforeAll(async () => {
  workDir = await mkdtemp(join(tmpdir(), 'ci-sandbox-git-'));
  remoteDir = join(workDir, 'remote');
  await mkdir(remoteDir);
  remoteUrl = `file://${remoteDir}`;
  await git(remoteDir, 'init', '-q', '-b', 'main');
  firstSha = await commit(
    remoteDir,
    {
      'src/app.ts': "const a = 1;\nlogger.info('Hello world');\nLOGGER.warn('Loud');\n",
      'docs/readme.md': '# Readme\n',
    },
    'first'
  );
  await git(remoteDir, 'tag', '-a', 'v1.0', '-m', 'release');
  mainSha = await commit(
    remoteDir,
    {
      'src/app.ts':
        "const a = 1;\nlogger.info('Hello world');\nLOGGER.warn('Loud');\nlogger.error('Bad');\n",
      'src/no_newline.ts': 'first\nlast without newline',
      'src/lines.txt': Array.from({ length: 12 }, (_, index) => `line ${index + 1}`).join('\n'),
    },
    'second'
  );
  await git(remoteDir, 'checkout', '-q', '-b', 'feature');
  featureSha = await commit(remoteDir, { 'src/feature.ts': 'feature\n' }, 'feature');
  await git(remoteDir, 'checkout', '-q', '-b', 'big', 'main');
  const line = (index: number) => `BIGMATCH ${String(index).padStart(6, '0')} ${'x'.repeat(80)}`;
  bigSha = await commit(
    remoteDir,
    {
      'big/generated.txt': `${Array.from({ length: bigMatches }, (_, i) => line(i)).join('\n')}\n`,
    },
    'big'
  );
  await git(remoteDir, 'checkout', '-q', 'main');
  await git(remoteDir, 'config', 'uploadpack.allowReachableSHA1InWant', 'true');
});

afterAll(async () => {
  await rm(workDir, { recursive: true, force: true });
});

describe('SandboxGitRepositoryResolver', () => {
  it('resolves HEAD to the remote default branch in a shallow bare clone under the root', async () => {
    const { source, root } = open();

    const value = await resolved(source);

    expect(value).toEqual({ commitSha: mainSha, repository, requestedRevision: 'HEAD' });
    const clone = join(root, 'elastic__example.git');
    expect(await git(clone, 'rev-parse', '--is-bare-repository')).toBe('true');
    expect(await git(clone, 'rev-parse', '--is-shallow-repository')).toBe('true');
    expect(await git(clone, 'rev-list', '--count', '--all')).toBe('1');
  });

  it('follows the remote when its default branch moves between batches', async () => {
    const before = await resolved(open().source);
    await git(remoteDir, 'symbolic-ref', 'HEAD', 'refs/heads/feature');
    try {
      const after = await resolved(open().source);
      expect(before.commitSha).toBe(mainSha);
      expect(after.commitSha).toBe(featureSha);
    } finally {
      await git(remoteDir, 'symbolic-ref', 'HEAD', 'refs/heads/main');
    }
  });

  it('resolves branches, annotated tags, full ref names, and raw commit SHAs', async () => {
    expect((await resolved(open().source, 'feature')).commitSha).toBe(featureSha);
    expect((await resolved(open().source, 'v1.0')).commitSha).toBe(firstSha);
    expect((await resolved(open().source, 'refs/heads/feature')).commitSha).toBe(featureSha);
    expect((await resolved(open().source, 'refs/tags/v1.0')).commitSha).toBe(firstSha);
    expect((await resolved(open().source, firstSha)).commitSha).toBe(firstSha);
  });

  it('reports unknown refs and commits as revision_not_found', async () => {
    for (const revision of ['missing-branch', 'refs/tags/missing', 'f'.repeat(40)]) {
      const result = await open().source.repositoryResolver.resolve({ repository, revision });
      expect(result).toMatchObject({ status: 'failure', error: { code: 'revision_not_found' } });
    }
  });

  it('rejects unsafe revisions and unconfigured repositories before running anything', async () => {
    const { session, source } = open();

    await expect(
      source.repositoryResolver.resolve({ repository, revision: '--upload-pack=evil' })
    ).resolves.toMatchObject({ error: { code: 'invalid_repository_revision' } });
    await expect(
      source.repositoryResolver.resolve({ repository: 'elastic/other', revision: 'HEAD' })
    ).resolves.toMatchObject({ error: { code: 'repository_not_configured' } });
    expect(session.commands).toHaveLength(0);
  });

  it('resolves a repository once per batch and pins its commit', async () => {
    const { session, source } = open();
    await resolved(source);
    const commands = session.commands.length;

    await expect(resolved(source)).resolves.toMatchObject({ commitSha: mainSha });
    await expect(
      source.repositoryResolver.resolve({ repository, revision: 'feature' })
    ).resolves.toMatchObject({ error: { code: 'revision_already_pinned' } });
    expect(session.commands).toHaveLength(commands);
  });
});

describe('SandboxGitSourceReader', () => {
  it('greps case-insensitively by default and returns path, line, and text', async () => {
    const { source } = open();
    const repo = await resolved(source);

    const page = await source.reader.grep({ repository: repo, pattern: 'logger\\.(info|warn)' });

    expect(page).toEqual({
      status: 'complete',
      items: [
        { path: 'src/app.ts', line: 2, text: "logger.info('Hello world');" },
        { path: 'src/app.ts', line: 3, text: "LOGGER.warn('Loud');" },
      ],
    });
    await expect(
      source.reader.grep({ repository: repo, pattern: 'LOGGER', caseSensitive: true })
    ).resolves.toEqual({
      status: 'complete',
      items: [{ path: 'src/app.ts', line: 3, text: "LOGGER.warn('Loud');" }],
    });
  });

  it('returns a complete empty page when grep finds nothing', async () => {
    const { source } = open();
    const repo = await resolved(source);

    await expect(
      source.reader.grep({ repository: repo, pattern: 'nothing-matches-this' })
    ).resolves.toEqual({ status: 'complete', items: [] });
  });

  it('pages grep results through authenticated continuations bound to the request', async () => {
    const { source } = open({ pageSize: 1 });
    const repo = await resolved(source);

    const first = await source.reader.grep({ repository: repo, pattern: 'logger' });
    expect(first).toMatchObject({ status: 'incomplete', items: [{ line: 2 }] });
    if (first.status !== 'incomplete') throw new Error('expected a continuation');

    await expect(
      source.reader.grep({ repository: repo, pattern: 'other', cursor: first.nextCursor })
    ).resolves.toMatchObject({ error: { code: 'invalid_continuation' } });
    await expect(
      source.reader.grep({ repository: repo, pattern: 'logger', cursor: `${first.nextCursor}x` })
    ).resolves.toMatchObject({ error: { code: 'invalid_continuation' } });

    const second = await source.reader.grep({
      repository: repo,
      pattern: 'logger',
      cursor: first.nextCursor,
    });
    expect(second).toMatchObject({ status: 'incomplete', items: [{ line: 3 }] });
    if (second.status !== 'incomplete') throw new Error('expected a continuation');
    const third = await source.reader.grep({
      repository: repo,
      pattern: 'logger',
      cursor: second.nextCursor,
    });
    expect(third).toEqual({
      status: 'complete',
      items: [{ path: 'src/app.ts', line: 4, text: "logger.error('Bad');" }],
    });
  });

  it('lists source paths recursively and within a literal path', async () => {
    const { source } = open();
    const repo = await resolved(source);

    await expect(
      source.reader.listSourcePage({ repository: repo, recursive: true })
    ).resolves.toEqual({
      status: 'complete',
      items: [
        { path: 'docs/readme.md' },
        { path: 'src/app.ts' },
        { path: 'src/lines.txt' },
        { path: 'src/no_newline.ts' },
      ],
    });
    await expect(source.reader.listSourcePage({ repository: repo })).resolves.toEqual({
      status: 'complete',
      items: [{ path: 'docs' }, { path: 'src' }],
    });
    await expect(
      source.reader.listSourcePage({ repository: repo, recursive: true, path: 'docs' })
    ).resolves.toEqual({ status: 'complete', items: [{ path: 'docs/readme.md' }] });
  });

  it('reads inclusive source windows, clamped to the end of the file', async () => {
    const { source } = open();
    const repo = await resolved(source);

    await expect(
      source.reader.readWindow({
        repository: repo,
        path: 'src/lines.txt',
        startLine: 3,
        endLine: 5,
      })
    ).resolves.toEqual({
      status: 'success',
      value: {
        path: 'src/lines.txt',
        startLine: 3,
        endLine: 5,
        lines: ['line 3', 'line 4', 'line 5'],
      },
    });
    await expect(
      source.reader.readWindow({
        repository: repo,
        path: 'src/no_newline.ts',
        startLine: 1,
        endLine: 9,
      })
    ).resolves.toEqual({
      status: 'success',
      value: {
        path: 'src/no_newline.ts',
        startLine: 1,
        endLine: 2,
        lines: ['first', 'last without newline'],
      },
    });
  });

  it('returns typed failures for windows past the end, trees, and missing paths', async () => {
    const { source } = open();
    const repo = await resolved(source);

    await expect(
      source.reader.readWindow({
        repository: repo,
        path: 'src/lines.txt',
        startLine: 40,
        endLine: 41,
      })
    ).resolves.toMatchObject({ error: { code: 'source_window_out_of_range' } });
    await expect(
      source.reader.readWindow({ repository: repo, path: 'src', startLine: 1, endLine: 1 })
    ).resolves.toMatchObject({ error: { code: 'source_path_not_blob' } });
    await expect(
      source.reader.readWindow({
        repository: repo,
        path: 'src/missing.ts',
        startLine: 1,
        endLine: 1,
      })
    ).resolves.toMatchObject({ error: { code: 'git_nonzero_exit' } });
  });

  it('refuses reads at a commit the batch did not resolve', async () => {
    const { source } = open();
    await resolved(source);

    await expect(
      source.reader.grep({
        repository: { repository, commitSha: firstSha, requestedRevision: firstSha },
        pattern: 'logger',
      })
    ).resolves.toMatchObject({ error: { code: 'revision_not_pinned' } });
  });

  it('spools grep output above 4 MiB in the pod and reads it back in chunks', async () => {
    const { session, source } = open();
    const repo = await resolved(source, 'big');
    expect(repo.commitSha).toBe(bigSha);

    let count = 0;
    let cursor: string | undefined;
    for (;;) {
      const page = await source.reader.grep({
        repository: repo,
        pattern: 'BIGMATCH',
        path: 'big',
        ...(cursor === undefined ? {} : { cursor }),
      });
      if (page.status === 'failure') throw new Error(page.error.code);
      count += page.items.length;
      if (page.status === 'complete') break;
      cursor = page.nextCursor;
    }

    expect(count).toBe(bigMatches);
    expect(session.maxStdoutBytes).toBeLessThan(STDOUT_LIMIT);
    const scan = session.commands.find(({ env }) => env?.CI_OP === 'grep');
    expect(Number(scan?.env?.CI_LIMIT)).toBeGreaterThan(STDOUT_LIMIT);
  }, 60_000);
});

describe('SandboxGit probe and restore', () => {
  const loseClone = (root: string) =>
    rm(join(root, 'elastic__example.git'), { recursive: true, force: true });

  it('re-clones the pinned commit after gRPC UNAVAILABLE and retries the command once', async () => {
    const { session, source, root } = open();
    const repo = await resolved(source);
    session.hooks.push(async () => {
      await loseClone(root);
      throw Object.assign(new Error('14 UNAVAILABLE'), { code: 14 });
    });

    await expect(
      source.reader.grep({ repository: repo, pattern: 'logger\\.error' })
    ).resolves.toMatchObject({
      status: 'complete',
      items: [{ line: 4 }],
    });
    expect(session.commands.filter(({ command }) => command === RESTORE_SCRIPT)).toHaveLength(1);
  });

  it('re-clones after a timed-out command and retries it once', async () => {
    const { session, source, root } = open();
    const repo = await resolved(source);
    session.hooks.push(async () => {
      await loseClone(root);
      return { stdout: '', stderr: '', exit_code: 124, timed_out: true };
    });

    await expect(
      source.reader.readWindow({
        repository: repo,
        path: 'src/lines.txt',
        startLine: 1,
        endLine: 1,
      })
    ).resolves.toMatchObject({ status: 'success', value: { lines: ['line 1'] } });
    expect(session.commands.filter(({ command }) => command === RESTORE_SCRIPT)).toHaveLength(1);
  });

  it('re-clones when the probe finds the clone gone between commands', async () => {
    const { session, source, root } = open();
    const repo = await resolved(source);
    await loseClone(root);

    await expect(source.reader.listSourcePage({ repository: repo })).resolves.toMatchObject({
      status: 'complete',
    });
    expect(session.commands.filter(({ command }) => command === RESTORE_SCRIPT)).toHaveLength(1);
  });

  it('rebuilds a lost spool byte for byte and continues from the continuation offset', async () => {
    const { source, root } = open({ pageSize: 1, chunkBytes: 16 });
    const repo = await resolved(source);
    const first = await source.reader.grep({ repository: repo, pattern: 'logger' });
    if (first.status !== 'incomplete') throw new Error('expected a continuation');
    await rm(root, { recursive: true, force: true });

    const second = await source.reader.grep({
      repository: repo,
      pattern: 'logger',
      cursor: first.nextCursor,
    });

    expect(second).toMatchObject({ status: 'incomplete', items: [{ line: 3 }] });
  });

  it('gives up with a typed failure when the retry is lost too', async () => {
    const { session, source } = open();
    const repo = await resolved(source);
    const unavailable = async () => {
      throw Object.assign(new Error('14 UNAVAILABLE'), { code: 14 });
    };
    session.hooks.push(unavailable, unavailable, unavailable, unavailable);

    await expect(
      source.reader.grep({ repository: repo, pattern: 'logger' })
    ).resolves.toMatchObject({
      status: 'failure',
    });
  });
});

describe('SandboxGit credentials and cleanup', () => {
  it('passes the token only as clone and fetch environment, never in command text or logs', async () => {
    const log = logger();
    const { session, source, root } = open({ log });
    const repo = await resolved(source);
    await source.reader.grep({ repository: repo, pattern: 'logger' });
    await source.reader.readWindow({
      repository: repo,
      path: 'src/app.ts',
      startLine: 1,
      endLine: 2,
    });
    await rm(join(root, 'elastic__example.git'), { recursive: true, force: true });
    await source.reader.listSourcePage({ repository: repo });

    for (const { command, env } of session.commands) {
      expect(command).not.toContain(TOKEN);
      const carriesCredential = JSON.stringify(env).includes('GIT_CONFIG_VALUE_0');
      expect(carriesCredential).toBe(
        command.includes('fetch_ref') // only the resolve and restore scripts fetch
      );
    }
    expect(JSON.stringify(log.debug.mock.calls)).not.toContain(TOKEN);
    expect(JSON.stringify(log.debug.mock.calls)).not.toContain(
      githubTokenEnv(TOKEN).GIT_CONFIG_VALUE_0
    );
  });

  it('deletes the clone and its spools when a repository finishes, and the root when the batch closes', async () => {
    const { source, root } = open({ pageSize: 1 });
    const repo = await resolved(source);
    await source.reader.grep({ repository: repo, pattern: 'logger' });
    expect(await readdir(join(root, 'spool'))).toHaveLength(1);

    await source.finishRepository(repository);

    expect(existsSync(join(root, 'elastic__example.git'))).toBe(false);
    expect(await readdir(join(root, 'spool'))).toHaveLength(0);
    await source.close();
    expect(existsSync(root)).toBe(false);
  });

  it('runs no command, and so allocates no pod, for a batch that never started', async () => {
    const { session, source } = open();

    await source.close();

    expect(session.commands).toHaveLength(0);
  });
});
