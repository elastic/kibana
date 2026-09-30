/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'node:crypto';
import { isLeft } from 'fp-ts/Either';

import { grepRequestRt, sourcePageRequestRt, sourceWindowRequestRt } from '../../domain';
import type {
  GrepMatch,
  GrepRequest,
  OperationResult,
  PageResult,
  ResolvedRepository,
  SourcePageRequest,
  SourcePath,
  SourceReader,
  SourceWindow,
  SourceWindowRequest,
} from '../../domain';
import type { GitCommandFailure } from '../local_git/local_bare_git_helpers';
import {
  LOCAL_GIT_MAX_ACTIVE_SPOOLS,
  LOCAL_GIT_MAX_SPOOL_BYTES,
  LOCAL_GIT_MAX_SPOOL_CONCURRENCY,
  LOCAL_GIT_MAX_TOTAL_SPOOL_BYTES,
  LOCAL_GIT_PAGE_SIZE,
  LOCAL_GIT_SPOOL_TTL_MS,
  commandFailure,
  cursorRequest,
  decodeCursor,
  decodeRepositoryPath,
  encodeCursor,
  failure,
  findRecordEnd,
  isCursorPath,
  isSafePattern,
} from '../local_git/local_bare_git_helpers';
import {
  CHUNK_SCRIPT,
  OBJECT_MISSING_EXIT,
  OBJECT_NOT_BLOB_EXIT,
  SCAN_SCRIPT,
  SPOOL_MISSING_EXIT,
  WINDOW_SCRIPT,
} from './sandbox_git_scripts';
import { SANDBOX_GIT_TIMEOUTS, type SandboxGitWorkspace } from './sandbox_git_workspace';

const MAX_RECORD_BYTES = 1_048_576;
const MAX_SOURCE_WINDOW_BYTES = 16 * 1024 * 1024;
/** Raw bytes per chunk read; base64 makes it about 2.7 MiB, under the 4 MiB `RunCommand` stdout limit. */
export const SANDBOX_GIT_CHUNK_BYTES = 2 * 1024 * 1024;
/** Waits for a scan slot as long as the local adapter does relative to its command timeout. */
const SPOOL_SLOT_WAIT_MS = 4 * SANDBOX_GIT_TIMEOUTS.scanSeconds * 1_000;
const SCAN_RESULT = /^(\d+) (\d+) ([0-9a-f]{40}|[0-9a-f]{64})$/;
const WINDOW_HEADER = /^(inline|spooled) (\d+)$/;

export interface SandboxGitSourceReaderOptions {
  readonly workspace: SandboxGitWorkspace;
  readonly cursorSecret: string;
  readonly pageSize?: number;
  readonly chunkBytes?: number;
  readonly maxSpoolBytes?: number;
  readonly maxTotalSpoolBytes?: number;
  readonly maxActiveSpools?: number;
  readonly maxSpoolConcurrency?: number;
  readonly spoolTtlMs?: number;
}

type Operation = 'grep' | 'tree';

/** A completed, validated spool that lives in the pod; only its metadata and 1 cached chunk live in Kibana. */
interface PodSpool {
  readonly id: string;
  readonly path: string;
  readonly bytes: number;
  readonly sha256: string;
  readonly operation: Operation;
  readonly repository: string;
  readonly commitSha: string;
  readonly request: string;
  readonly expiresAt: number;
  /** Operation-specific scan variables, kept so a spool lost with its pod can be rebuilt byte for byte. */
  readonly scanEnv: Readonly<Record<string, string>>;
  /** False for transient source-window spools, which fail instead of being rebuilt. */
  readonly restorable: boolean;
  cache?: { readonly offset: number; readonly data: Buffer };
  timer?: NodeJS.Timeout;
}

const isFailure = (value: unknown): value is GitCommandFailure =>
  typeof value === 'object' && value !== null && 'code' in value && 'retryable' in value;

const gitFailed: GitCommandFailure = {
  code: 'git_nonzero_exit',
  message: 'Git command failed.',
  retryable: true,
};
const spoolUnavailable: GitCommandFailure = {
  code: 'continuation_unavailable',
  message: 'Source continuation is unavailable.',
  retryable: true,
};
const spoolReadFailure: GitCommandFailure = {
  code: 'spool_read_failure',
  message: 'Temporary source spool could not be read.',
  retryable: true,
};

const parseGrepRecord = (record: Buffer, commitSha: string): GrepMatch | undefined => {
  const first = record.indexOf(0);
  const second = record.indexOf(0, first + 1);
  if (first < 0 || second < 0) return undefined;
  const prefix = Buffer.from(`${commitSha}:`);
  if (!record.subarray(0, prefix.length).equals(prefix)) return undefined;
  const path = decodeRepositoryPath(record.subarray(prefix.length, first));
  if (path === undefined) return undefined;
  const line = Number(record.subarray(first + 1, second).toString('utf8'));
  if (!Number.isSafeInteger(line) || line < 1) return undefined;
  return { path, line, text: record.subarray(second + 1, record.length - 1).toString('utf8') };
};

const parseTreeRecord = (record: Buffer): SourcePath | undefined => {
  const path = decodeRepositoryPath(record.subarray(0, record.length - 1));
  return path === undefined ? undefined : { path };
};

/**
 * Reads the batch's pinned sandbox clones. `grep` and tree listings build a complete, validated
 * spool in the pod before page 1, then serve later pages from it through HMAC continuations,
 * reading at most one chunk per command so no response exceeds the 4 MiB stdout limit.
 */
export class SandboxGitSourceReader implements SourceReader {
  private readonly workspace: SandboxGitWorkspace;
  private readonly cursorSecret: string;
  private readonly pageSize: number;
  private readonly chunkBytes: number;
  private readonly maxSpoolBytes: number;
  private readonly maxTotalSpoolBytes: number;
  private readonly maxActiveSpools: number;
  private readonly maxSpoolConcurrency: number;
  private readonly spoolTtlMs: number;
  private readonly spools = new Map<string, PodSpool>();
  private spoolBytes = 0;
  private pendingSpools = 0;
  private activeScans = 0;
  private readonly scanSlotWaiters: Array<() => void> = [];

  constructor(options: SandboxGitSourceReaderOptions) {
    if (options.cursorSecret.length < 16)
      throw new Error('Sandbox Git cursor secret must be at least 16 characters.');
    this.workspace = options.workspace;
    this.cursorSecret = options.cursorSecret;
    this.pageSize = Math.min(options.pageSize ?? LOCAL_GIT_PAGE_SIZE, LOCAL_GIT_PAGE_SIZE);
    this.chunkBytes = options.chunkBytes ?? SANDBOX_GIT_CHUNK_BYTES;
    this.maxSpoolBytes = options.maxSpoolBytes ?? LOCAL_GIT_MAX_SPOOL_BYTES;
    this.maxTotalSpoolBytes = options.maxTotalSpoolBytes ?? LOCAL_GIT_MAX_TOTAL_SPOOL_BYTES;
    this.maxActiveSpools = options.maxActiveSpools ?? LOCAL_GIT_MAX_ACTIVE_SPOOLS;
    this.maxSpoolConcurrency = options.maxSpoolConcurrency ?? LOCAL_GIT_MAX_SPOOL_CONCURRENCY;
    this.spoolTtlMs = options.spoolTtlMs ?? LOCAL_GIT_SPOOL_TTL_MS;
    if (
      [
        this.pageSize,
        this.chunkBytes,
        this.maxSpoolBytes,
        this.maxTotalSpoolBytes,
        this.maxActiveSpools,
        this.maxSpoolConcurrency,
        this.spoolTtlMs,
      ].some((value) => !Number.isSafeInteger(value) || value < 1) ||
      this.chunkBytes > SANDBOX_GIT_CHUNK_BYTES ||
      this.maxSpoolBytes > this.maxTotalSpoolBytes
    )
      throw new Error('Sandbox Git resource limits are invalid.');
  }

  /** Rejects reads for repositories that are not configured or not resolved to this commit in the batch. */
  private checkRepository(repository: ResolvedRepository): GitCommandFailure | undefined {
    if (this.workspace.remote(repository.repository) === undefined)
      return {
        code: 'repository_not_configured',
        message: 'Repository is not configured for sandbox access.',
        retryable: false,
      };
    return this.workspace.pinned(repository.repository)?.commitSha === repository.commitSha
      ? undefined
      : {
          code: 'revision_not_pinned',
          message: 'Repository revision was not resolved in this batch.',
          retryable: false,
        };
  }

  private acquireScanSlot(): Promise<boolean> {
    if (this.scanSlotWaiters.length === 0 && this.activeScans < this.maxSpoolConcurrency) {
      this.activeScans += 1;
      return Promise.resolve(true);
    }
    return new Promise((resolve) => {
      const grant = (): void => {
        clearTimeout(timer);
        resolve(true);
      };
      const timer = setTimeout(() => {
        const index = this.scanSlotWaiters.indexOf(grant);
        if (index >= 0) this.scanSlotWaiters.splice(index, 1);
        resolve(false);
      }, SPOOL_SLOT_WAIT_MS);
      this.scanSlotWaiters.push(grant);
    });
  }

  private freeScanSlot(): void {
    const next = this.scanSlotWaiters.shift();
    if (next === undefined) this.activeScans -= 1;
    else next();
  }

  /** Forgets one spool, releases its capacity, and deletes its pod file. */
  private async removeSpool(spool: PodSpool): Promise<void> {
    if (this.spools.get(spool.id) !== spool) return;
    this.spools.delete(spool.id);
    this.spoolBytes -= spool.bytes;
    if (spool.timer !== undefined) clearTimeout(spool.timer);
    await this.workspace.remove(spool.path);
  }

  private async cleanupExpiredSpools(): Promise<void> {
    const now = Date.now();
    await Promise.all(
      [...this.spools.values()]
        .filter(({ expiresAt }) => expiresAt <= now)
        .map((spool) => this.removeSpool(spool))
    );
  }

  /** Runs one scan into `path` and returns its size and digest, or a typed failure. */
  private async scan(
    repository: string,
    commitSha: string,
    path: string,
    operation: Operation,
    scanEnv: Readonly<Record<string, string>>
  ): Promise<{ readonly bytes: number; readonly sha256: string } | GitCommandFailure> {
    const result = await this.workspace.runInRepository(repository, commitSha, {
      command: SCAN_SCRIPT,
      env: {
        ...scanEnv,
        CI_SPOOL: path,
        CI_SPOOL_DIR: this.workspace.spoolDirectory,
        CI_LIMIT: String(this.maxSpoolBytes + 1),
      },
      timeoutSeconds: SANDBOX_GIT_TIMEOUTS.scanSeconds,
    });
    if (isFailure(result)) return result;
    const match = result.exit_code === 0 ? SCAN_RESULT.exec(result.stdout.trim()) : null;
    if (match === null) return gitFailed;
    const [, gitExit, size, sha256] = match;
    const bytes = Number(size);
    if (bytes > this.maxSpoolBytes)
      return {
        code: 'spool_byte_limit_exceeded',
        message: 'Git source result exceeded temporary spool capacity.',
        retryable: false,
      };
    if (gitExit !== '0' && !(operation === 'grep' && gitExit === '1'))
      return {
        ...gitFailed,
        exitCode: Number(gitExit),
        ...(result.stderr.includes('not a git repository')
          ? { message: 'Configured repository is not a valid bare Git repository.' }
          : {}),
      };
    return { bytes, sha256 };
  }

  /** Rebuilds a spool lost with its pod and proves it is byte-identical to the original. */
  private async restoreSpool(spool: PodSpool): Promise<GitCommandFailure | undefined> {
    const rebuilt = await this.scan(
      spool.repository,
      spool.commitSha,
      spool.path,
      spool.operation,
      spool.scanEnv
    );
    if (isFailure(rebuilt)) return rebuilt;
    return rebuilt.bytes === spool.bytes && rebuilt.sha256 === spool.sha256
      ? undefined
      : spoolUnavailable;
  }

  /** Reads one chunk of a pod spool starting at `offset`, restoring the spool once if it was lost. */
  private async readChunk(spool: PodSpool, offset: number): Promise<Buffer | GitCommandFailure> {
    const { cache } = spool;
    if (cache !== undefined && offset >= cache.offset && offset < cache.offset + cache.data.length)
      return cache.data.subarray(offset - cache.offset);
    const length = Math.min(this.chunkBytes, spool.bytes - offset);
    for (let attempt = 0; attempt < 2; attempt++) {
      const result = await this.workspace.runInRepository(spool.repository, spool.commitSha, {
        command: CHUNK_SCRIPT,
        env: {
          CI_SPOOL: spool.path,
          CI_SIZE: String(spool.bytes),
          CI_START: String(offset + 1),
          CI_LENGTH: String(length),
        },
        timeoutSeconds: SANDBOX_GIT_TIMEOUTS.chunkSeconds,
      });
      if (isFailure(result)) return result;
      if (result.exit_code === SPOOL_MISSING_EXIT && attempt === 0 && spool.restorable) {
        const restored = await this.restoreSpool(spool);
        if (restored !== undefined) return restored;
        continue;
      }
      if (result.exit_code !== 0) return spoolReadFailure;
      const data = Buffer.from(result.stdout, 'base64');
      if (data.length !== length) return spoolReadFailure;
      spool.cache = { offset, data };
      return data;
    }
    return spoolUnavailable;
  }

  /**
   * Visits every complete record from `offset` in order. `visit` returns `true` to stop early.
   * Returns a failure for unreadable or structurally invalid output.
   */
  private async forEachRecord(
    spool: PodSpool,
    offset: number,
    visit: (record: Buffer, recordOffset: number) => boolean | GitCommandFailure
  ): Promise<GitCommandFailure | undefined> {
    let pending: Buffer = Buffer.alloc(0);
    let pendingOffset = offset;
    let position = offset;
    while (position < spool.bytes) {
      const chunk = await this.readChunk(spool, position);
      if (isFailure(chunk)) return chunk;
      position += chunk.length;
      pending = pending.length === 0 ? chunk : Buffer.concat([pending, chunk]);
      for (;;) {
        const end = findRecordEnd(spool.operation, pending);
        if (end < 0) break;
        const record = pending.subarray(0, end + 1);
        if (record.length > MAX_RECORD_BYTES)
          return {
            code: 'malformed_git_output',
            message: 'Git source output contains an oversized record.',
            retryable: false,
          };
        const recordOffset = pendingOffset;
        pending = pending.subarray(end + 1);
        pendingOffset += end + 1;
        const visited = visit(record, recordOffset);
        if (visited === true) return undefined;
        if (isFailure(visited)) return visited;
      }
      if (pending.length > MAX_RECORD_BYTES)
        return {
          code: 'malformed_git_output',
          message: 'Git source output contains an oversized record.',
          retryable: false,
        };
    }
    return pending.length === 0
      ? undefined
      : {
          code: 'malformed_git_output',
          message: 'Git source output ended with an incomplete record.',
          retryable: false,
        };
  }

  /** Builds and fully validates a spool before any page of it is exposed. */
  private async createSpool(
    repository: ResolvedRepository,
    operation: Operation,
    scanEnv: Readonly<Record<string, string>>,
    fingerprint: string
  ): Promise<PodSpool | GitCommandFailure> {
    await this.cleanupExpiredSpools();
    if (!(await this.acquireScanSlot()))
      return {
        code: 'spool_concurrency_exceeded',
        message: 'Too many Git source scans are active.',
        retryable: true,
      };
    this.pendingSpools += 1;
    const path = `${this.workspace.spoolDirectory}/${randomUUID()}`;
    let registered = false;
    try {
      if (
        this.spools.size + this.pendingSpools > this.maxActiveSpools ||
        this.spoolBytes >= this.maxTotalSpoolBytes
      )
        return {
          code: 'spool_capacity_exceeded',
          message: 'Temporary source spool capacity is exhausted.',
          retryable: true,
        };
      const scanned = await this.scan(
        repository.repository,
        repository.commitSha,
        path,
        operation,
        scanEnv
      );
      if (isFailure(scanned)) return scanned;
      if (this.spoolBytes + scanned.bytes > this.maxTotalSpoolBytes)
        return {
          code: 'spool_capacity_exceeded',
          message: 'Temporary source spool capacity is exhausted.',
          retryable: true,
        };
      const spool: PodSpool = {
        id: randomUUID(),
        path,
        bytes: scanned.bytes,
        sha256: scanned.sha256,
        operation,
        repository: repository.repository,
        commitSha: repository.commitSha,
        request: fingerprint,
        expiresAt: Number.MAX_SAFE_INTEGER,
        scanEnv,
        restorable: true,
      };
      const invalid = await this.forEachRecord(spool, 0, (record) =>
        (operation === 'grep'
          ? parseGrepRecord(record, repository.commitSha)
          : parseTreeRecord(record)) === undefined
          ? {
              code: 'malformed_git_output',
              message:
                operation === 'grep'
                  ? 'Git grep returned an invalid source record.'
                  : 'Git tree returned an invalid repository path.',
              retryable: false,
            }
          : false
      );
      if (invalid !== undefined) return invalid;
      const completed: PodSpool = { ...spool, expiresAt: Date.now() + this.spoolTtlMs };
      this.spools.set(completed.id, completed);
      this.spoolBytes += completed.bytes;
      registered = true;
      completed.timer = setTimeout(() => void this.removeSpool(completed), this.spoolTtlMs);
      completed.timer.unref();
      return completed;
    } finally {
      this.pendingSpools -= 1;
      this.freeScanSlot();
      if (!registered) await this.workspace.remove(path);
    }
  }

  private async spoolForRequest(
    repository: ResolvedRepository,
    operation: Operation,
    scanEnv: Readonly<Record<string, string>>,
    fingerprint: string,
    token: string | undefined
  ): Promise<{ readonly spool: PodSpool; readonly byteOffset: number } | GitCommandFailure> {
    await this.cleanupExpiredSpools();
    const cursor = decodeCursor(
      this.cursorSecret,
      token,
      operation,
      repository.repository,
      repository.commitSha,
      fingerprint
    );
    if (cursor === 'invalid_continuation')
      return { code: cursor, message: 'Source continuation is invalid.', retryable: false };
    if (cursor === 'continuation_expired')
      return { code: cursor, message: 'Source continuation has expired.', retryable: false };
    if (cursor === 'initial') {
      const spool = await this.createSpool(repository, operation, scanEnv, fingerprint);
      return isFailure(spool) ? spool : { spool, byteOffset: 0 };
    }
    const spool = this.spools.get(cursor.spoolId);
    if (
      spool === undefined ||
      spool.expiresAt !== cursor.expiresAt ||
      spool.operation !== operation ||
      spool.repository !== repository.repository ||
      spool.commitSha !== repository.commitSha ||
      spool.request !== fingerprint
    )
      return spoolUnavailable;
    if (spool.expiresAt <= Date.now())
      return {
        code: 'continuation_expired',
        message: 'Source continuation has expired.',
        retryable: false,
      };
    if (cursor.byteOffset > spool.bytes)
      return {
        code: 'invalid_continuation',
        message: 'Source continuation is invalid.',
        retryable: false,
      };
    return { spool, byteOffset: cursor.byteOffset };
  }

  /** Serves one page from a spool, deleting it after the final page or a failure. */
  private async page<Item>(
    spool: PodSpool,
    byteOffset: number,
    parse: (record: Buffer) => Item | undefined
  ): Promise<PageResult<Item>> {
    const items: Item[] = [];
    let nextOffset: number | undefined;
    const failed = await this.forEachRecord(spool, byteOffset, (record, recordOffset) => {
      if (items.length === this.pageSize) {
        nextOffset = recordOffset;
        return true;
      }
      const item = parse(record);
      if (item === undefined)
        return {
          code: 'malformed_git_output',
          message: 'Git source output could not be parsed safely.',
          retryable: false,
        };
      items.push(item);
      return false;
    });
    if (failed !== undefined) {
      await this.removeSpool(spool);
      return commandFailure(failed);
    }
    if (nextOffset === undefined) {
      await this.removeSpool(spool);
      return { status: 'complete', items };
    }
    return {
      status: 'incomplete',
      items,
      nextCursor: encodeCursor(this.cursorSecret, {
        version: 2,
        operation: spool.operation,
        repository: spool.repository,
        commitSha: spool.commitSha,
        request: spool.request,
        spoolId: spool.id,
        byteOffset: nextOffset,
        expiresAt: spool.expiresAt,
      }),
    };
  }

  public async grep(request: GrepRequest): Promise<PageResult<GrepMatch>> {
    try {
      if (
        isLeft(grepRequestRt.decode(request)) ||
        !isSafePattern(request.pattern) ||
        !isCursorPath(request.path)
      )
        return failure('invalid_grep_request', 'Grep request is invalid.', false);
      const invalid = this.checkRepository(request.repository);
      if (invalid !== undefined) return commandFailure(invalid);
      const fingerprint = cursorRequest({
        caseSensitive: request.caseSensitive ?? false,
        path: request.path ?? null,
        pattern: request.pattern,
      });
      const selected = await this.spoolForRequest(
        request.repository,
        'grep',
        {
          CI_OP: 'grep',
          CI_PATTERN: request.pattern,
          CI_ICASE: request.caseSensitive ? '' : '1',
          CI_PATHSPEC: request.path === undefined ? '' : `:(literal)${request.path}`,
          CI_RECURSIVE: '',
        },
        fingerprint,
        request.cursor
      );
      if (isFailure(selected)) return commandFailure(selected);
      return await this.page(selected.spool, selected.byteOffset, (record) =>
        parseGrepRecord(record, request.repository.commitSha)
      );
    } catch (_error: unknown) {
      return failure('sandbox_git_operational_failure', 'Sandbox Git operation failed.', true);
    }
  }

  public async listSourcePage(request: SourcePageRequest): Promise<PageResult<SourcePath>> {
    try {
      if (isLeft(sourcePageRequestRt.decode(request)) || !isCursorPath(request.path))
        return failure('invalid_source_page_request', 'Source page request is invalid.', false);
      const invalid = this.checkRepository(request.repository);
      if (invalid !== undefined) return commandFailure(invalid);
      const fingerprint = cursorRequest({
        path: request.path ?? null,
        recursive: request.recursive ?? false,
      });
      const selected = await this.spoolForRequest(
        request.repository,
        'tree',
        {
          CI_OP: 'tree',
          CI_PATTERN: '',
          CI_ICASE: '',
          CI_PATHSPEC: request.path === undefined ? '' : `:(literal)${request.path}`,
          CI_RECURSIVE: request.recursive ? '1' : '',
        },
        fingerprint,
        request.cursor
      );
      if (isFailure(selected)) return commandFailure(selected);
      return await this.page(selected.spool, selected.byteOffset, parseTreeRecord);
    } catch (_error: unknown) {
      return failure('sandbox_git_operational_failure', 'Sandbox Git operation failed.', true);
    }
  }

  /** Reads a spooled source window chunk by chunk, then deletes it. */
  private async readSpooledWindow(
    repository: ResolvedRepository,
    path: string,
    bytes: number
  ): Promise<Buffer | GitCommandFailure> {
    const spool: PodSpool = {
      id: randomUUID(),
      path,
      bytes,
      sha256: '',
      operation: 'tree',
      repository: repository.repository,
      commitSha: repository.commitSha,
      request: '',
      expiresAt: Number.MAX_SAFE_INTEGER,
      scanEnv: {},
      restorable: false,
    };
    const chunks: Buffer[] = [];
    try {
      for (let offset = 0; offset < bytes; ) {
        const chunk = await this.readChunk(spool, offset);
        if (isFailure(chunk)) return chunk;
        chunks.push(chunk);
        offset += chunk.length;
      }
      return Buffer.concat(chunks);
    } finally {
      await this.workspace.remove(path);
    }
  }

  public async readWindow(request: SourceWindowRequest): Promise<OperationResult<SourceWindow>> {
    try {
      if (isLeft(sourceWindowRequestRt.decode(request)))
        return failure('invalid_source_window_request', 'Source window request is invalid.', false);
      const invalid = this.checkRepository(request.repository);
      if (invalid !== undefined) return commandFailure(invalid);
      const path = `${this.workspace.spoolDirectory}/${randomUUID()}.window`;
      const result = await this.workspace.runInRepository(
        request.repository.repository,
        request.repository.commitSha,
        {
          command: WINDOW_SCRIPT,
          env: {
            CI_PATH: request.path,
            CI_START_LINE: String(request.startLine),
            CI_LINE_COUNT: String(request.endLine - request.startLine + 1),
            CI_LIMIT: String(MAX_SOURCE_WINDOW_BYTES + 1),
            CI_INLINE: String(this.chunkBytes),
            CI_SPOOL: path,
            CI_SPOOL_DIR: this.workspace.spoolDirectory,
          },
          timeoutSeconds: SANDBOX_GIT_TIMEOUTS.blobSeconds,
        }
      );
      if (isFailure(result)) return commandFailure(result);
      if (result.exit_code === OBJECT_NOT_BLOB_EXIT)
        return failure('source_path_not_blob', 'Requested source path is not a blob.', false);
      if (result.exit_code === OBJECT_MISSING_EXIT) return commandFailure(gitFailed);
      const newline = result.stdout.indexOf('\n');
      const header =
        result.exit_code === 0 && newline >= 0
          ? WINDOW_HEADER.exec(result.stdout.slice(0, newline))
          : null;
      if (header === null) {
        await this.workspace.remove(path);
        return commandFailure(gitFailed);
      }
      const bytes = Number(header[2]);
      if (bytes > MAX_SOURCE_WINDOW_BYTES) {
        await this.workspace.remove(path);
        return failure(
          'source_window_byte_limit_exceeded',
          'Requested source window exceeds its explicit byte limit.',
          false
        );
      }
      const content =
        header[1] === 'inline'
          ? Buffer.from(result.stdout.slice(newline + 1), 'base64')
          : await this.readSpooledWindow(request.repository, path, bytes);
      if (isFailure(content)) return commandFailure(content);
      if (content.length !== bytes) return commandFailure(spoolReadFailure);
      const lines: string[] = [];
      for (let start = 0; start < content.length; ) {
        const end = content.indexOf(10, start);
        const lineEnd = end < 0 ? content.length : end;
        if (lineEnd - start > MAX_RECORD_BYTES)
          return failure('source_line_too_large', 'Source line exceeds its explicit limit.', false);
        lines.push(content.subarray(start, lineEnd).toString('utf8'));
        start = lineEnd + 1;
      }
      if (lines.length === 0)
        return failure(
          'source_window_out_of_range',
          'Requested source window starts beyond the file.',
          false
        );
      return {
        status: 'success',
        value: {
          startLine: request.startLine,
          endLine: request.startLine + lines.length - 1,
          path: request.path,
          lines,
        },
      };
    } catch (_error: unknown) {
      return failure('sandbox_git_operational_failure', 'Sandbox Git operation failed.', true);
    }
  }

  /** Forgets and deletes every spool of one repository after it finishes. */
  public async releaseRepository(repository: string): Promise<void> {
    await Promise.all(
      [...this.spools.values()]
        .filter((spool) => spool.repository === repository)
        .map((spool) => this.removeSpool(spool))
    );
  }

  /** Stops every expiry timer; the workspace deletes the pod files. */
  public close(): void {
    for (const spool of this.spools.values()) {
      if (spool.timer !== undefined) clearTimeout(spool.timer);
    }
    this.spools.clear();
    this.spoolBytes = 0;
  }
}
