/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHmac, timingSafeEqual } from 'node:crypto';
import { type ChildProcess, spawn } from 'node:child_process';
import { lstat, realpath } from 'node:fs/promises';
import { isLeft } from 'fp-ts/Either';

import { containsControlCharacter, isSafeRevision } from '../../../common/repository_settings';
import { repositoryRelativePathRt } from '../../domain';
import type { LocalBareGitConfiguration } from './local_bare_git_configuration';

/** Limits records returned in one source page. */
export const LOCAL_GIT_PAGE_SIZE = 200;
/** Limits one Git command wall-clock duration. */
export const LOCAL_GIT_COMMAND_TIMEOUT_MS = 15_000;
/** Limits one temporary spool file. */
export const LOCAL_GIT_MAX_SPOOL_BYTES = 256 * 1024 * 1024;
/** Limits all temporary spool files owned by one reader. */
export const LOCAL_GIT_MAX_TOTAL_SPOOL_BYTES = 1024 * 1024 * 1024;
/** Limits simultaneous Git scans that are creating spools. */
export const LOCAL_GIT_MAX_SPOOL_CONCURRENCY = 2;
/** Limits how long one scan waits in line for a concurrency slot. */
export const LOCAL_GIT_SPOOL_SLOT_WAIT_MS = 4 * LOCAL_GIT_COMMAND_TIMEOUT_MS;
/** Limits retained completed spools. */
export const LOCAL_GIT_MAX_ACTIVE_SPOOLS = 16;
/** Limits the lifetime of a continuation spool. */
export const LOCAL_GIT_SPOOL_TTL_MS = 10 * 60_000;
/** Retains only bounded Git diagnostics. */
const MAX_STDERR_BYTES = 16_384;
/** Limits a repository-relative path carried in a server-generated continuation. */
const MAX_CURSOR_PATH_BYTES = 4_096;
/** Bounds the JSON fingerprint embedded in a server-generated continuation. */
const MAX_CURSOR_REQUEST_BYTES = 16_384;
/** Allows a terminated child a short grace period before forced cleanup. */
const GIT_KILL_GRACE_MS = 500;
/** Stops oversized untrusted continuations before token parsing or authentication work. */
const MAX_CURSOR_TOKEN_BYTES = 4 * (MAX_CURSOR_REQUEST_BYTES + MAX_CURSOR_PATH_BYTES + 512);

/** Finds the inclusive boundary of one complete operation-specific Git output record. */
export const findRecordEnd = (operation: 'grep' | 'tree', pending: Buffer): number => {
  if (operation === 'tree') return pending.indexOf(0);
  /** Finds the first field delimiter in grep output. */
  const first = pending.indexOf(0);
  /** Finds the line-number delimiter in grep output. */
  const second = first < 0 ? -1 : pending.indexOf(0, first + 1);
  return second < 0 ? -1 : pending.indexOf(10, second + 1);
};

/** Maps one visible repository identity to a trusted bare repository. */
export interface LocalBareRepositoryMapping {
  readonly repository: string;
  readonly bareRepositoryPath: string;
  readonly remoteName: string;
  readonly expectedRemoteUrl: string;
}

/** Configures local bare-Git access and bounded continuation spools. */
export interface LocalBareGitOptions {
  readonly repositories: readonly LocalBareRepositoryMapping[];
  readonly cursorSecret: string;
  readonly pageSize?: number;
  readonly commandTimeoutMs?: number;
  readonly maxSpoolBytes?: number;
  readonly maxTotalSpoolBytes?: number;
  readonly maxSpoolConcurrency?: number;
  readonly spoolSlotWaitMs?: number;
  readonly maxActiveSpools?: number;
  readonly spoolTtlMs?: number;
  /** Trusted absolute parent for private per-reader spool namespaces. */
  readonly spoolRootPath?: string;
}

/** Represents a sanitized operational failure. */
export interface GitCommandFailure {
  readonly code: string;
  readonly message: string;
  readonly retryable: boolean;
  readonly exitCode?: number | null;
  /** Retains private diagnostic text only for expected revision classification. */
  readonly diagnostic?: string;
}

/** Records an owned, completed temporary output spool. */
export interface Spool {
  readonly id: string;
  readonly path: string;
  readonly bytes: number;
  readonly operation: 'grep' | 'tree';
  readonly repository: string;
  readonly commitSha: string;
  readonly request: string;
  readonly expiresAt: number;
}

/** Couples a retained spool with the authenticated position that selected it. */
export interface SpoolRequest {
  readonly spool: Spool;
  readonly byteOffset: number;
}

/** Persists an instance namespace's original expiry across process restart. */
export interface SpoolNamespaceMetadata {
  readonly version: 1;
  readonly pid: number;
  readonly expiresAt: number;
}

/** Authenticated data carried by an opaque continuation. */
export interface SpoolCursor {
  readonly version: 2;
  readonly operation: 'grep' | 'tree';
  readonly repository: string;
  readonly commitSha: string;
  readonly request: string;
  readonly spoolId: string;
  readonly byteOffset: number;
  readonly expiresAt: number;
}

/** Returns a typed port failure. */
export const failure = (code: string, message: string, retryable: boolean) => ({
  status: 'failure' as const,
  error: { code, message, retryable },
});

/** Converts a Git failure to a port failure. */
export const commandFailure = (result: GitCommandFailure) =>
  failure(result.code, result.message, result.retryable);

/** Narrows a command result to its typed operational failure. */
export const isGitCommandFailure = (
  result: Buffer | GitCommandFailure
): result is GitCommandFailure => !(result instanceof Buffer);

/** Narrows a source-window result to its typed operational failure. */
export const isSourceWindowFailure = (
  result: readonly string[] | GitCommandFailure
): result is GitCommandFailure => !Array.isArray(result);

/** Identifies Git's expected response when an exact object ID cannot resolve to a commit. */
export const isUnavailableCommit = (result: GitCommandFailure): boolean =>
  result.code === 'git_nonzero_exit' &&
  result.exitCode === 128 &&
  /(?:not a valid object name|needed a single revision|expected commit type|dereferences to (?:blob|tree|tag) type|is a (?:blob|tree|tag), not a commit)/i.test(
    result.diagnostic ?? ''
  );

export { containsControlCharacter, isSafeRevision };

/** Validates a Git grep regular expression transport value. */
export const isSafePattern = (pattern: string): boolean =>
  pattern.length > 0 && pattern.length <= 2_048 && !containsControlCharacter(pattern);

/** Keeps server-generated continuation fingerprints within their declared bounded envelope. */
export const isCursorPath = (path: string | undefined): boolean =>
  path === undefined || Buffer.byteLength(path, 'utf8') <= MAX_CURSOR_PATH_BYTES;

/** Decodes and validates an untrusted Git path without lossy UTF-8 replacement. */
export const decodeRepositoryPath = (value: Buffer): string | undefined => {
  try {
    /** Rejects malformed UTF-8 instead of turning it into a replacement character. */
    const path = new TextDecoder('utf-8', { fatal: true }).decode(value);
    return isLeft(repositoryRelativePathRt.decode(path)) ? undefined : path;
  } catch (_error: unknown) {
    return undefined;
  }
};

/** Builds shell-free Git arguments for a configured bare repository. */
const gitArguments = (bareRepositoryPath: string, args: readonly string[]): string[] => [
  '-c',
  'core.hooksPath=/dev/null',
  `--git-dir=${bareRepositoryPath}`,
  ...args,
];

/** Starts Git with immutable-history and deterministic-diagnostic policy in an isolated process group. */
export const spawnGit = (bareRepositoryPath: string, args: readonly string[]) =>
  spawn('git', ['--no-replace-objects', ...gitArguments(bareRepositoryPath, args)], {
    detached: process.platform !== 'win32',
    env: {
      ...process.env,
      GIT_GRAFT_FILE: '',
      GIT_NO_REPLACE_OBJECTS: '1',
      LANGUAGE: 'C',
      LC_ALL: 'C',
    },
    stdio: ['pipe', 'pipe', 'pipe'],
    windowsHide: true,
  });

/** Terminates a Git-owned process group and closes inherited pipes without targeting unrelated processes. */
const terminateGitProcessGroup = (child: ChildProcess, signal: NodeJS.Signals): void => {
  child.stdout?.pause();
  child.stderr?.pause();
  child.stdout?.destroy();
  child.stderr?.destroy();
  try {
    if (process.platform !== 'win32' && child.pid !== undefined) process.kill(-child.pid, signal);
    else child.kill(signal);
  } catch (_error: unknown) {
    // The child or its dedicated process group may already have exited.
  }
};

/** Escalates timeout termination for a Git-owned process group after a bounded grace period. */
export const terminateGitWithEscalation = (child: ChildProcess, onEscalated?: () => void): void => {
  terminateGitProcessGroup(child, 'SIGTERM');
  /** Schedules forced termination after the graceful process-group signal. */
  const escalation = setTimeout(() => {
    terminateGitProcessGroup(child, 'SIGKILL');
    onEscalated?.();
  }, GIT_KILL_GRACE_MS);
  escalation.unref();
};

/** Runs a bounded whole-output Git command without invoking a shell. */
export const runGit = async (
  bareRepositoryPath: string,
  args: readonly string[],
  timeoutMs: number,
  maxStdoutBytes: number
): Promise<Buffer | GitCommandFailure> =>
  new Promise((resolve) => {
    /** Starts fixed Git with separate argv values. */
    const child = spawnGit(bareRepositoryPath, args);
    /** Holds bounded command output. */
    const stdout: Buffer[] = [];
    /** Holds bounded diagnostics for classification only. */
    const stderr: Buffer[] = [];
    /** Counts stdout to enforce the declared command limit. */
    let stdoutBytes = 0;
    /** Counts retained stderr bytes. */
    let stderrBytes = 0;
    /** Marks deadline cancellation. */
    let timedOut = false;
    /** Marks output-limit cancellation. */
    let tooLarge = false;
    /** Terminates Git at the wall-clock deadline and escalates if a helper retains stdio. */
    const timer = setTimeout(() => {
      timedOut = true;
      terminateGitWithEscalation(child);
      resolve({ code: 'git_timeout', message: 'Git command timed out.', retryable: true });
    }, timeoutMs);
    child.stdout.on('data', (chunk: Buffer) => {
      stdoutBytes += chunk.length;
      if (stdoutBytes > maxStdoutBytes) {
        tooLarge = true;
        terminateGitWithEscalation(child);
      } else stdout.push(chunk);
    });
    child.stderr.on('data', (chunk: Buffer) => {
      if (stderrBytes >= MAX_STDERR_BYTES) return;
      /** Restricts diagnostic retention. */
      const retained = chunk.subarray(0, MAX_STDERR_BYTES - stderrBytes);
      stderrBytes += retained.length;
      stderr.push(retained);
    });
    child.once('error', () => {
      clearTimeout(timer);
      resolve({
        code: 'git_spawn_failure',
        message: 'Git command could not start.',
        retryable: true,
      });
    });
    child.once('close', (exitCode: number | null) => {
      clearTimeout(timer);
      if (timedOut)
        return resolve({ code: 'git_timeout', message: 'Git command timed out.', retryable: true });
      if (tooLarge)
        return resolve({
          code: 'git_output_limit_exceeded',
          message: 'Git source response exceeded its explicit limit.',
          retryable: false,
        });
      if (exitCode !== 0) {
        /** Uses a small diagnostic only to identify invalid configured storage. */
        const diagnostic = Buffer.concat(stderr).toString('utf8');
        return resolve({
          code: 'git_nonzero_exit',
          diagnostic,
          exitCode,
          message: diagnostic.includes('not a git repository')
            ? 'Configured repository is not a valid bare Git repository.'
            : 'Git command failed.',
          retryable: true,
        });
      }
      return resolve(Buffer.concat(stdout));
    });
  });

/** Creates a stable query fingerprint for cursor binding. */
export const cursorRequest = (request: Record<string, unknown>): string => JSON.stringify(request);

/** Signs an opaque continuation cursor. */
export const encodeCursor = (secret: string, cursor: SpoolCursor): string => {
  /** Serializes cursor data before signing. */
  const payload = Buffer.from(JSON.stringify(cursor)).toString('base64url');
  /** Authenticates the opaque payload with server-held material. */
  const signature = createHmac('sha256', secret).update(payload).digest('base64url');
  return `${payload}.${signature}`;
};

/** Decodes a valid cursor or returns its typed rejection code. */
export const decodeCursor = (
  secret: string,
  token: string | undefined,
  operation: SpoolCursor['operation'],
  repository: string,
  commitSha: string,
  request: string
): SpoolCursor | 'initial' | 'invalid_continuation' | 'continuation_expired' => {
  if (token === undefined) return 'initial';
  // This is derived from the largest server fingerprint and cursor envelope, before hostile input work.
  if (Buffer.byteLength(token, 'utf8') > MAX_CURSOR_TOKEN_BYTES) return 'invalid_continuation';
  /** Splits the fixed signed token shape. */
  const parts = token.split('.');
  if (parts.length !== 2 || parts[0] === undefined || parts[1] === undefined)
    return 'invalid_continuation';
  /** Computes the expected MAC before trusting payload data. */
  const expected = Buffer.from(
    createHmac('sha256', secret).update(parts[0]).digest('base64url'),
    'base64url'
  );
  /** Decodes the submitted MAC for constant-time comparison. */
  const actual = Buffer.from(parts[1], 'base64url');
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected))
    return 'invalid_continuation';
  try {
    /** Parses the authenticated but still schema-untrusted payload. */
    const parsed = JSON.parse(
      Buffer.from(parts[0], 'base64url').toString('utf8')
    ) as Partial<SpoolCursor>;
    if (
      parsed.version !== 2 ||
      parsed.operation !== operation ||
      parsed.repository !== repository ||
      parsed.commitSha !== commitSha ||
      parsed.request !== request ||
      typeof parsed.spoolId !== 'string' ||
      !Number.isSafeInteger(parsed.byteOffset) ||
      (parsed.byteOffset ?? -1) < 0 ||
      !Number.isSafeInteger(parsed.expiresAt)
    )
      return 'invalid_continuation';
    if ((parsed.expiresAt ?? 0) <= Date.now()) return 'continuation_expired';
    return parsed as SpoolCursor;
  } catch (_error: unknown) {
    return 'invalid_continuation';
  }
};

/** Verifies configured bare-repository identity before every source operation. */
export const verifyBareRepository = async (
  configuration: LocalBareGitConfiguration,
  mapping: LocalBareRepositoryMapping
): Promise<true | GitCommandFailure> => {
  try {
    /** Rejects a symlink at the configuration-owned entry point. */
    const repositoryStat = await lstat(mapping.bareRepositoryPath);
    if (repositoryStat.isSymbolicLink())
      return {
        code: 'repository_symlink_rejected',
        message: 'Configured repository path must not be a symlink.',
        retryable: false,
      };
    await realpath(mapping.bareRepositoryPath);
  } catch (_error: unknown) {
    return {
      code: 'repository_missing',
      message: 'Configured repository is unavailable.',
      retryable: true,
    };
  }
  /** Proves the path is a bare Git store. */
  const bare = await runGit(
    mapping.bareRepositoryPath,
    ['rev-parse', '--is-bare-repository'],
    configuration.commandTimeoutMs,
    64
  );
  if (bare instanceof Buffer && bare.toString('utf8').trim() !== 'true')
    return {
      code: 'repository_invalid',
      message: 'Configured repository is not bare.',
      retryable: false,
    };
  if (isGitCommandFailure(bare)) return bare;
  /** Proves the path still maps to the configured repository identity. */
  const remote = await runGit(
    mapping.bareRepositoryPath,
    ['remote', 'get-url', mapping.remoteName],
    configuration.commandTimeoutMs,
    16_384
  );
  if (isGitCommandFailure(remote)) return remote;
  return remote.toString('utf8').trim() === mapping.expectedRemoteUrl
    ? true
    : {
        code: 'repository_identity_mismatch',
        message: 'Configured repository does not match its expected remote identity.',
        retryable: false,
      };
};
