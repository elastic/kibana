/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'node:crypto';
import type { FileHandle } from 'node:fs/promises';
import { lstat, mkdir, open, readdir, readFile, rmdir, stat, unlink } from 'node:fs/promises';
import { join } from 'node:path';
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
import { GitBatchBlobReader } from './git_batch_blob_reader';
import { LocalBareGitConfiguration } from './local_bare_git_configuration';
import type {
  GitCommandFailure,
  LocalBareGitOptions,
  LocalBareRepositoryMapping,
  Spool,
  SpoolNamespaceMetadata,
  SpoolRequest,
} from './local_bare_git_helpers';
import {
  commandFailure,
  cursorRequest,
  decodeCursor,
  decodeRepositoryPath,
  encodeCursor,
  failure,
  findRecordEnd,
  isCursorPath,
  isSafePattern,
  isSourceWindowFailure,
  spawnGit,
  terminateGitWithEscalation,
  verifyBareRepository,
} from './local_bare_git_helpers';

const MAX_STDERR_BYTES = 16_384;
const SPOOL_READ_BYTES = 64 * 1024;
const MAX_RECORD_BYTES = 1_048_576;
const SPOOL_FILE_NAME = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}\.out$/i;
const SPOOL_UNLINK_RETRY_MS = 100;

/** Creates one private metadata file without replacing an existing path. */
const writeExclusiveFile = async (path: string, content: string): Promise<void> => {
  const handle = await open(path, 'wx', 0o600);
  try {
    await handle.writeFile(content);
  } finally {
    await handle.close();
  }
};

/** Writes an entire stream chunk even when the filesystem reports a short write. */
const writeFully = async (handle: FileHandle, chunk: Buffer): Promise<void> => {
  /** Tracks the next unwritten byte in the chunk. */
  let offset = 0;
  while (offset < chunk.length) {
    /** Retries the remaining bytes until the filesystem confirms complete persistence. */
    const result = await handle.write(chunk, offset, chunk.length - offset);
    if (result.bytesWritten < 1) throw new Error('Temporary spool write made no progress.');
    offset += result.bytesWritten;
  }
};

/** Reads configured immutable bare repositories through bounded temporary spools. */
export class LocalBareGitSourceReader implements SourceReader {
  private readonly configuration: LocalBareGitConfiguration;
  private readonly batchReaders = new Map<string, GitBatchBlobReader>();
  private readonly spools = new Map<string, Spool>();
  private spoolDirectory: Promise<string> | undefined;
  private filesystemSpoolBytes = 0;
  private filesystemSpoolCount = 0;
  private spoolBytes = 0;
  private reservedSpoolBytes = 0;
  private pendingSpools = 0;
  private readonly pendingSpoolPaths = new Set<string>();
  /** Holds incomplete files that could not be unlinked and must continue consuming capacity. */
  private readonly failedSpools = new Map<string, number>();
  private activeScans = 0;
  /** Grants released scan slots to waiting scans in arrival order. */
  private readonly scanSlotWaiters: Array<() => void> = [];

  /** Binds source reads to explicit repositories and local resource limits. */
  constructor(options: LocalBareGitOptions) {
    this.configuration = new LocalBareGitConfiguration(options);
  }

  /** Takes a scan slot, waiting in line up to the configured bound; false means the wait expired. */
  private acquireScanSlot(): Promise<boolean> {
    if (
      this.scanSlotWaiters.length === 0 &&
      this.activeScans < this.configuration.maxSpoolConcurrency
    ) {
      this.activeScans += 1;
      return Promise.resolve(true);
    }
    return new Promise((resolve) => {
      /** Receives a slot handed over directly by a releasing scan. */
      const grant = (): void => {
        clearTimeout(timer);
        resolve(true);
      };
      /** Leaves the line once the bounded wait expires. */
      const timer = setTimeout(() => {
        const index = this.scanSlotWaiters.indexOf(grant);
        if (index >= 0) this.scanSlotWaiters.splice(index, 1);
        resolve(false);
      }, this.configuration.spoolSlotWaitMs);
      this.scanSlotWaiters.push(grant);
    });
  }

  /** Hands a released slot to the oldest waiting scan, or frees it when nobody is waiting. */
  private freeScanSlot(): void {
    const next = this.scanSlotWaiters.shift();
    if (next === undefined) this.activeScans -= 1;
    else next();
  }

  /** Returns the one reusable batch reader bound to a configured bare repository path. */
  private batchReader(bareRepositoryPath: string): GitBatchBlobReader {
    /** Reuses a warm process so concurrent source-window calls serialize over one Git child. */
    const existing = this.batchReaders.get(bareRepositoryPath);
    if (existing !== undefined) return existing;
    /** Creates a lazy process owner without starting Git until the first source window. */
    const reader = new GitBatchBlobReader(bareRepositoryPath, this.configuration.commandTimeoutMs);
    this.batchReaders.set(bareRepositoryPath, reader);
    return reader;
  }

  /** Sweeps only dead-process namespaces whose persisted original expiry has elapsed. */
  private async sweepOrphanedNamespaces(parent: string): Promise<void> {
    /** Lists possible reader namespaces beneath the trusted parent. */
    const entries = await readdir(parent, { withFileTypes: true });
    await Promise.all(
      entries.map(async (entry) => {
        if (!entry.isDirectory() || !/^[0-9a-f-]{36}$/i.test(entry.name)) return;
        /** Identifies the candidate namespace to inspect. */
        const directory = join(parent, entry.name);
        /** Locates persisted ownership metadata for this namespace. */
        const metadataPath = join(directory, 'metadata.json');
        try {
          /** Reads persisted namespace ownership and expiry metadata. */
          const metadata = JSON.parse(
            await readFile(metadataPath, 'utf8')
          ) as Partial<SpoolNamespaceMetadata>;
          /** Captures the process that created the namespace. */
          const pid = metadata.pid;
          /** Captures the namespace's original expiry deadline. */
          const expiresAt = metadata.expiresAt;
          if (
            metadata.version !== 1 ||
            typeof pid !== 'number' ||
            !Number.isSafeInteger(pid) ||
            typeof expiresAt !== 'number' ||
            !Number.isSafeInteger(expiresAt) ||
            pid === process.pid ||
            (expiresAt ?? 0) > Date.now()
          )
            return;
          try {
            process.kill(pid, 0);
            return;
          } catch (error: unknown) {
            if (!(error instanceof Error) || !('code' in error) || error.code !== 'ESRCH') return;
          }
          /** Lists files to verify the namespace contains only owned output. */
          const children = await readdir(directory, { withFileTypes: true });
          if (
            children.some(
              (child) =>
                !child.isFile() ||
                (child.name !== 'metadata.json' && !SPOOL_FILE_NAME.test(child.name))
            )
          )
            return;
          await Promise.all(children.map(async (child) => unlink(join(directory, child.name))));
          await rmdir(directory);
        } catch (_error: unknown) {
          // Unknown namespaces are not demonstrably adapter-owned orphan output.
        }
      })
    );
  }

  /** Creates one private reader namespace beneath a trusted stable parent. */
  private getSpoolDirectory(): Promise<string> {
    if (this.spoolDirectory !== undefined) return this.spoolDirectory;
    /** Initializes this reader's namespace once while setup remains healthy. */
    const initialization = (async () => {
      /** Uses the configured trusted parent for this reader's private namespace. */
      const parent = this.configuration.spoolRootPath;
      await mkdir(parent, { mode: 0o700, recursive: true });
      /** Rechecks ownership and permissions on the trusted parent. */
      const root = await lstat(parent);
      /** Captures the current Unix owner for the namespace safety check. */
      const currentUid = process.getuid?.();
      if (
        !root.isDirectory() ||
        root.isSymbolicLink() ||
        currentUid === undefined ||
        root.uid !== currentUid ||
        root.mode % 64 !== 0
      )
        throw new Error('Local Git spool root is unsafe.');
      await this.sweepOrphanedNamespaces(parent);
      /** Names a fresh private namespace with an unpredictable identifier. */
      const directory = join(parent, randomUUID());
      await mkdir(directory, { mode: 0o700 });
      /** Records ownership and expiry before any spool output is created. */
      const metadata: SpoolNamespaceMetadata = {
        version: 1,
        pid: process.pid,
        expiresAt: Date.now() + this.configuration.spoolTtlMs,
      };
      await writeExclusiveFile(join(directory, 'metadata.json'), JSON.stringify(metadata));
      return directory;
    })();
    this.spoolDirectory = initialization;
    // A repaired trusted root must let this reader retry rather than retain a rejected setup promise.
    void initialization.catch(() => {
      if (this.spoolDirectory === initialization) this.spoolDirectory = undefined;
    });
    return initialization;
  }

  /** Sweeps only this reader's expired regular UUID spool files and accounts remaining files. */
  private async sweepSpoolDirectory(): Promise<void> {
    /** Resolves this reader's private spool namespace. */
    const directory = await this.getSpoolDirectory();
    /** Lists files whose sizes contribute to retained spool capacity. */
    const entries = await readdir(directory, { withFileTypes: true });
    /** Accumulates bytes in retained spool files. */
    let bytes = 0;
    /** Counts retained spool files. */
    let count = 0;
    await Promise.all(
      entries.map(async (entry) => {
        if (!entry.isFile() || !SPOOL_FILE_NAME.test(entry.name)) return;
        /** Resolves the candidate spool file within this private namespace. */
        const path = join(directory, entry.name);
        // Active writers are already represented by reservations, never by a directory snapshot.
        if (this.pendingSpoolPaths.has(path)) return;
        /** Rechecks file type and symlink status before accounting its size. */
        const file = await lstat(path).catch(() => undefined);
        if (file === undefined || !file.isFile() || file.isSymbolicLink()) return;
        // Retained spools expire from their post-validation cursor timestamp, not filesystem mtime.
        bytes += file.size;
        count += 1;
      })
    );
    this.filesystemSpoolBytes = bytes;
    this.filesystemSpoolCount = count;
  }

  /** Deletes expired own files and releases their accounted capacity. */
  private async cleanupExpiredSpools(): Promise<void> {
    /** Captures expiry candidates before asynchronous deletion. */
    const expired = [...this.spools.values()].filter((spool) => spool.expiresAt <= Date.now());
    await Promise.all(expired.map(async (spool) => this.removeSpool(spool)));
    await this.sweepSpoolDirectory();
  }

  /** Deletes one own spool only after filesystem removal succeeds or confirms the file is absent. */
  private async removeSpool(spool: Spool): Promise<void> {
    if (this.spools.get(spool.id) !== spool) return;
    try {
      await unlink(spool.path);
    } catch (error: unknown) {
      if (!(error instanceof Error) || !('code' in error) || error.code !== 'ENOENT') {
        // Retain capacity until a transient EACCES/EBUSY-style failure can be retried safely.
        /** Retries removal so failed cleanup continues to consume capacity safely. */
        const retry = setTimeout(() => void this.removeSpool(spool), SPOOL_UNLINK_RETRY_MS);
        retry.unref();
        return;
      }
    }
    if (!this.spools.delete(spool.id)) return;
    this.spoolBytes -= spool.bytes;
    this.filesystemSpoolBytes -= spool.bytes;
    this.filesystemSpoolCount -= 1;
  }

  /** Validates every completed Git record before any page can report success. */
  private async validateSpool(spool: Spool): Promise<GitCommandFailure | undefined> {
    /** Opens the completed spool for structural validation. */
    const handle = await open(spool.path, 'r').catch(() => undefined);
    if (handle === undefined)
      return {
        code: 'spool_read_failure',
        message: 'Temporary source spool could not be read.',
        retryable: true,
      };
    /** Holds the one incomplete record crossing chunk boundaries. */
    let pending = Buffer.alloc(0);
    /** Tracks sequential spool reads. */
    let position = 0;
    try {
      while (position < spool.bytes) {
        /** Reads the next bounded chunk of spool output. */
        const buffer = Buffer.allocUnsafe(Math.min(SPOOL_READ_BYTES, spool.bytes - position));
        /** Reads bytes at the current absolute spool position. */
        const result = await handle.read(buffer, 0, buffer.length, position);
        // A completed spool's verified length makes a premature EOF a retryable storage failure.
        if (result.bytesRead === 0)
          return {
            code: 'spool_read_failure',
            message: 'Temporary source spool could not be read.',
            retryable: true,
          };
        position += result.bytesRead;
        pending = Buffer.concat([pending, buffer.subarray(0, result.bytesRead)]);
        while (pending.length > 0) {
          /** Finds one complete operation-specific record in pending bytes. */
          const end = findRecordEnd(spool.operation, pending);
          if (end < 0) break;
          /** Isolates the complete record for validation. */
          const record = pending.subarray(0, end + 1);
          pending = pending.subarray(end + 1);
          if (record.length > MAX_RECORD_BYTES)
            return {
              code: 'malformed_git_output',
              message: 'Git source output contains an oversized record.',
              retryable: false,
            };
          if (spool.operation === 'tree') {
            if (decodeRepositoryPath(record.subarray(0, record.length - 1)) === undefined)
              return {
                code: 'malformed_git_output',
                message: 'Git tree returned an invalid repository path.',
                retryable: false,
              };
          } else {
            /** Finds the path delimiter in the validated grep record. */
            const first = record.indexOf(0);
            /** Finds the line-number delimiter in the validated grep record. */
            const second = record.indexOf(0, first + 1);
            /** Builds the immutable commit prefix required by Git grep output. */
            const prefix = Buffer.from(`${spool.commitSha}:`);
            /** Parses the one-based source line from the validated record. */
            const line = Number(record.subarray(first + 1, second).toString('utf8'));
            if (
              !record.subarray(0, prefix.length).equals(prefix) ||
              decodeRepositoryPath(record.subarray(prefix.length, first)) === undefined ||
              !Number.isSafeInteger(line) ||
              line < 1
            )
              return {
                code: 'malformed_git_output',
                message: 'Git grep returned an invalid source record.',
                retryable: false,
              };
          }
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
    } catch (_error: unknown) {
      return {
        code: 'spool_read_failure',
        message: 'Temporary source spool could not be read.',
        retryable: true,
      };
    } finally {
      await handle.close().catch(() => undefined);
    }
  }

  /** Streams one complete Git result into a capped temporary spool before exposing any page. */
  private async createSpool(
    mapping: LocalBareRepositoryMapping,
    operation: 'grep' | 'tree',
    args: readonly string[],
    repository: string,
    commitSha: string,
    request: string
  ): Promise<Spool | GitCommandFailure> {
    await this.cleanupExpiredSpools();
    if (!(await this.acquireScanSlot()))
      return {
        code: 'spool_concurrency_exceeded',
        message: 'Too many Git source scans are active.',
        retryable: true,
      };
    /** Releases this scan's concurrency slot exactly once after its process group is stopped. */
    let scanSlotReleased = false;
    /** Keeps timeout retries from overlapping a still-running Git process group. */
    const releaseScanSlot = (): void => {
      if (scanSlotReleased) return;
      scanSlotReleased = true;
      this.freeScanSlot();
    };
    if (
      this.spools.size + this.pendingSpools + this.failedSpools.size >=
        this.configuration.maxActiveSpools ||
      this.spoolBytes + this.reservedSpoolBytes >= this.configuration.maxTotalSpoolBytes
    ) {
      releaseScanSlot();
      return {
        code: 'spool_capacity_exceeded',
        message: 'Temporary source spool capacity is exhausted.',
        retryable: true,
      };
    }
    this.pendingSpools += 1;
    /** Records whether a child close or escalation now owns concurrency-slot release. */
    let scanStarted = false;
    try {
      /** Allocates an unpredictable own filename under an OS-managed directory. */
      const path = join(await this.getSpoolDirectory(), `${randomUUID()}.out`);
      /** Opens the output before spawning Git so fast exits cannot race listener registration. */
      const handle = await open(path, 'wx', 0o600).catch(() => undefined);
      if (handle === undefined) {
        releaseScanSlot();
        return {
          code: 'spool_write_failure',
          message: 'Temporary source spool could not be created.',
          retryable: true,
        };
      }
      this.pendingSpoolPaths.add(path);
      return await new Promise<Spool | GitCommandFailure>((resolve) => {
        /** Starts Git only after the spool is ready. */
        const child = spawnGit(mapping.bareRepositoryPath, args);
        scanStarted = true;
        /** Tracks spool bytes before filesystem writes. */
        let bytes = 0;
        /** Tracks bounded stderr for no-match classification. */
        const stderr: Buffer[] = [];
        /** Tracks retained stderr bytes. */
        let stderrBytes = 0;
        /** Marks deadline cancellation. */
        let timedOut = false;
        /** Marks disk quota cancellation. */
        let quotaExceeded = false;
        /** Retains at most one stdout chunk while the filesystem write is in progress. */
        let writeComplete = Promise.resolve();
        /** Stops accepting output after a terminal result so no queued buffers survive cancellation. */
        let acceptingOutput = true;
        /** Stops all Git-owned processes and stream ingestion before any failure finalization. */
        const stopChild = (): void => {
          acceptingOutput = false;
          terminateGitWithEscalation(child, releaseScanSlot);
        };
        /** Cancels Git when the deadline passes and does not wait for a delayed close event. */
        const timer = setTimeout(() => {
          timedOut = true;
          stopChild();
          void finalize({
            code: 'git_timeout',
            message: 'Git command timed out.',
            retryable: true,
          });
        }, this.configuration.commandTimeoutMs);
        child.stdout.on('data', (chunk: Buffer) => {
          if (!acceptingOutput) return;
          // Pausing before each async write applies backpressure to the Git pipe.
          child.stdout.pause();
          writeComplete = (async () => {
            if (
              bytes + chunk.length > this.configuration.maxSpoolBytes ||
              this.spoolBytes + this.reservedSpoolBytes + chunk.length >
                this.configuration.maxTotalSpoolBytes
            ) {
              quotaExceeded = true;
              stopChild();
              return;
            }
            bytes += chunk.length;
            this.reservedSpoolBytes += chunk.length;
            await writeFully(handle, chunk);
          })().finally(() => {
            if (acceptingOutput) child.stdout.resume();
          });
          void writeComplete.catch(() => {
            stopChild();
            void finalize({
              code: 'spool_write_failure',
              message: 'Temporary source spool could not be written.',
              retryable: true,
            });
          });
        });
        child.stderr.on('data', (chunk: Buffer) => {
          if (stderrBytes >= MAX_STDERR_BYTES) return;
          /** Retains a bounded diagnostic classification sample. */
          const retained = chunk.subarray(0, MAX_STDERR_BYTES - stderrBytes);
          stderrBytes += retained.length;
          stderr.push(retained);
        });
        child.once('error', () => {
          releaseScanSlot();
          void finalize({
            code: 'git_spawn_failure',
            message: 'Git command could not start.',
            retryable: true,
          });
        });
        child.once('close', (exitCode: number | null) => {
          // A timeout retains the slot until SIGKILL grace ends because destroyed stdio can close first.
          if (!timedOut) releaseScanSlot();
          // Command time ends when Git closes; spool validation has its own bounded file reads.
          clearTimeout(timer);
          void writeComplete
            .then(async () => {
              if (settled) return;
              if (timedOut)
                return finalize({
                  code: 'git_timeout',
                  message: 'Git command timed out.',
                  retryable: true,
                });
              if (quotaExceeded)
                return finalize({
                  code: 'spool_byte_limit_exceeded',
                  message: 'Git source result exceeded temporary spool capacity.',
                  retryable: false,
                });
              if (exitCode !== 0 && !(operation === 'grep' && exitCode === 1))
                return finalize({
                  code: 'git_nonzero_exit',
                  exitCode,
                  message: Buffer.concat(stderr).toString('utf8').includes('not a git repository')
                    ? 'Configured repository is not a valid bare Git repository.'
                    : 'Git command failed.',
                  retryable: true,
                });
              /** Verifies physical spool length before exposing any page. */
              const spoolStat = await stat(path);
              if (settled) return;
              if (spoolStat.size !== bytes)
                return finalize({
                  code: 'spool_write_failure',
                  message: 'Temporary source spool size could not be verified.',
                  retryable: true,
                });
              /** Describes the output before validating every record in the completed spool. */
              const spool: Spool = {
                id: randomUUID(),
                path,
                bytes,
                operation,
                repository,
                commitSha,
                request,
                // Validation may exceed a short TTL; the externally visible lifetime starts only now.
                expiresAt: Number.MAX_SAFE_INTEGER,
              };
              /** Validates every retained Git record before exposing the spool. */
              const validation = await this.validateSpool(spool);
              if (settled) return;
              if (validation !== undefined) return finalize(validation);
              /** Starts cursor and cleanup expiry from the same post-validation timestamp. */
              const completedSpool: Spool = {
                ...spool,
                expiresAt: Date.now() + this.configuration.spoolTtlMs,
              };
              /** Transfers the file from reservation accounting to retained-spool accounting atomically. */
              if (settled) return;
              this.pendingSpoolPaths.delete(path);
              /** Does not expose page 1 until Git exit and complete spool validation succeed. */
              this.spools.set(completedSpool.id, completedSpool);
              this.reservedSpoolBytes -= bytes;
              this.spoolBytes += bytes;
              this.filesystemSpoolBytes += bytes;
              this.filesystemSpoolCount += 1;
              /** Cleans expired own output at exactly the cursor-visible expiry. */
              const expiryTimer = setTimeout(
                () => void this.removeSpool(completedSpool),
                Math.max(0, completedSpool.expiresAt - Date.now())
              );
              expiryTimer.unref();
              return finalize(completedSpool);
            })
            .catch(
              () =>
                void finalize({
                  code: 'spool_write_failure',
                  message: 'Temporary source spool could not be written.',
                  retryable: true,
                })
            );
        });
        /** Closes and removes incomplete output before returning any failure. */
        let settled = false;
        /** Finalizes the spool exactly once and releases failed output safely. */
        const finalize = (result: Spool | GitCommandFailure): void => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          /** Releases incomplete-file capacity only after unlink succeeds or proves the file is absent. */
          let failureReleased = false;
          /** Removes failed output and releases its reserved capacity. */
          const releaseFailure = async (): Promise<void> => {
            if (failureReleased) return;
            try {
              await unlink(path);
            } catch (error: unknown) {
              if (!(error instanceof Error) || !('code' in error) || error.code !== 'ENOENT') {
                // Count and bytes remain reserved until a safe retry can reclaim the incomplete spool.
                this.failedSpools.set(path, bytes);
                /** Retries failed-output cleanup without releasing capacity early. */
                const retry = setTimeout(() => void releaseFailure(), SPOOL_UNLINK_RETRY_MS);
                retry.unref();
                return;
              }
            }
            failureReleased = true;
            this.failedSpools.delete(path);
            this.pendingSpoolPaths.delete(path);
            this.reservedSpoolBytes -= bytes;
          };
          void handle.close().then(
            async () => {
              if (!('id' in result)) await releaseFailure();
              resolve(result);
            },
            async () => {
              if ('id' in result) await this.removeSpool(result);
              else await releaseFailure();
              resolve({
                code: 'spool_close_failure',
                message: 'Temporary source spool could not be closed.',
                retryable: true,
              });
            }
          );
        };
      });
    } catch (_error: unknown) {
      if (!scanStarted) releaseScanSlot();
      return {
        code: 'spool_write_failure',
        message: 'Temporary source spool could not be created.',
        retryable: true,
      };
    } finally {
      this.pendingSpools -= 1;
    }
  }

  /** Reads one complete record from an already-completed spool page. */
  private async readPage<Item>(
    spool: Spool,
    offset: number,
    parse: (record: Buffer) => Item | undefined
  ): Promise<
    { readonly items: readonly Item[]; readonly nextOffset?: number } | GitCommandFailure
  > {
    // Page 1 owns a freshly completed spool; only a resumed nonzero offset must reject expiry here.
    if (offset !== 0 && spool.expiresAt <= Date.now())
      return {
        code: 'continuation_expired',
        message: 'Source continuation has expired.',
        retryable: false,
      };
    if (offset > spool.bytes)
      return {
        code: 'invalid_continuation',
        message: 'Source continuation is invalid.',
        retryable: false,
      };
    /** Opens only the completed private spool. */
    const handle = await open(spool.path, 'r').catch(() => undefined);
    if (handle === undefined)
      return {
        code: 'continuation_unavailable',
        message: 'Source continuation is unavailable.',
        retryable: true,
      };
    /** Holds at most one incomplete record. */
    let pending = Buffer.alloc(0);
    /** Tracks this pending buffer's absolute starting byte. */
    let pendingOffset = offset;
    /** Tracks next disk read offset. */
    let position = offset;
    /** Holds one bounded page. */
    const items: Item[] = [];
    try {
      while (position < spool.bytes) {
        /** Reads a bounded spool segment. */
        const buffer = Buffer.allocUnsafe(Math.min(SPOOL_READ_BYTES, spool.bytes - position));
        /** Reads bytes at the current absolute spool position. */
        const result = await handle.read(buffer, 0, buffer.length, position);
        // A completed spool's verified length makes a premature EOF a retryable storage failure.
        if (result.bytesRead === 0)
          return {
            code: 'spool_read_failure',
            message: 'Temporary source spool could not be read.',
            retryable: true,
          };
        position += result.bytesRead;
        pending = Buffer.concat([pending, buffer.subarray(0, result.bytesRead)]);
        while (pending.length > 0) {
          /** Determines record boundaries from operation-specific Git output delimiters. */
          const end = findRecordEnd(spool.operation, pending);
          if (end < 0) break;
          /** Extracts one complete record and advances its absolute offset. */
          const record = pending.subarray(0, end + 1);
          if (record.length > MAX_RECORD_BYTES)
            return {
              code: 'malformed_git_output',
              message: 'Git source output contains an oversized record.',
              retryable: false,
            };
          /** Records the absolute offset of the extracted record. */
          const recordOffset = pendingOffset;
          pending = pending.subarray(end + 1);
          pendingOffset += end + 1;
          if (items.length === this.configuration.pageSize)
            return { items, nextOffset: recordOffset };
          /** Parses the validated record into the requested page item. */
          const item = parse(record);
          if (item === undefined)
            return {
              code: 'malformed_git_output',
              message: 'Git source output could not be parsed safely.',
              retryable: false,
            };
          items.push(item);
        }
        if (pending.length > MAX_RECORD_BYTES)
          return {
            code: 'malformed_git_output',
            message: 'Git source output contains an oversized record.',
            retryable: false,
          };
      }
      if (pending.length !== 0)
        return {
          code: 'malformed_git_output',
          message: 'Git source output ended with an incomplete record.',
          retryable: false,
        };
      return { items };
    } catch (_error: unknown) {
      return {
        code: 'spool_read_failure',
        message: 'Temporary source spool could not be read.',
        retryable: true,
      };
    } finally {
      await handle.close().catch(() => undefined);
    }
  }

  /** Resolves an initial spool or validates and retrieves its continuation spool. */
  private async spoolForRequest(
    mapping: LocalBareRepositoryMapping,
    operation: 'grep' | 'tree',
    args: readonly string[],
    repository: ResolvedRepository,
    fingerprint: string,
    token: string | undefined
  ): Promise<SpoolRequest | GitCommandFailure> {
    await this.cleanupExpiredSpools();
    /** Authenticates the requested continuation before selecting a spool. */
    const cursor = decodeCursor(
      this.configuration.cursorSecret,
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
      /** Creates a new complete spool for an initial request. */
      const spool = await this.createSpool(
        mapping,
        operation,
        args,
        repository.repository,
        repository.commitSha,
        fingerprint
      );
      return 'code' in spool ? spool : { spool, byteOffset: 0 };
    }
    await this.cleanupExpiredSpools();
    /** Looks up the authenticated retained spool by its opaque identifier. */
    const spool = this.spools.get(cursor.spoolId);
    if (
      spool === undefined ||
      spool.expiresAt !== cursor.expiresAt ||
      spool.operation !== operation ||
      spool.repository !== repository.repository ||
      spool.commitSha !== repository.commitSha ||
      spool.request !== fingerprint
    )
      return {
        code: 'continuation_unavailable',
        message: 'Source continuation is unavailable.',
        retryable: true,
      };
    if (spool.expiresAt <= Date.now())
      return {
        code: 'continuation_expired',
        message: 'Source continuation has expired.',
        retryable: false,
      };
    return { spool, byteOffset: cursor.byteOffset };
  }

  /** Issues a continuation bound to exactly one retained spool position. */
  private continuation(spool: Spool, byteOffset: number): string {
    return encodeCursor(this.configuration.cursorSecret, {
      version: 2,
      operation: spool.operation,
      repository: spool.repository,
      commitSha: spool.commitSha,
      request: spool.request,
      spoolId: spool.id,
      byteOffset,
      expiresAt: spool.expiresAt,
    });
  }

  /** Searches a full immutable result once, then serves bounded pages from its spool. */
  public async grep(request: GrepRequest): Promise<PageResult<GrepMatch>> {
    try {
      if (
        isLeft(grepRequestRt.decode(request)) ||
        !isSafePattern(request.pattern) ||
        !isCursorPath(request.path)
      )
        return failure('invalid_grep_request', 'Grep request is invalid.', false);
      /** Binds continuations to every search-affecting field. */
      const fingerprint = cursorRequest({
        caseSensitive: request.caseSensitive ?? false,
        path: request.path ?? null,
        pattern: request.pattern,
      });
      /** Selects the configured mapping for the requested repository. */
      const mapping = this.configuration.repositories.get(request.repository.repository);
      if (mapping === undefined)
        return failure(
          'repository_not_configured',
          'Repository is not configured for local access.',
          false
        );
      /** Probes the trusted repository for every source operation, including continuations. */
      const verified = await verifyBareRepository(this.configuration, mapping);
      if (verified !== true) return commandFailure(verified);
      /** Uses only argv values and a resolved immutable SHA. */
      const args = ['grep', '--full-name', '-n', '-z', '-I', '-E'];
      if (!request.caseSensitive) args.push('-i');
      args.push('-e', request.pattern, request.repository.commitSha, '--');
      if (request.path !== undefined) args.push(`:(literal)${request.path}`);
      /** Resolves the initial or continuation spool for this grep request. */
      const spool = await this.spoolForRequest(
        mapping,
        'grep',
        args,
        request.repository,
        fingerprint,
        request.cursor
      );
      if (!('spool' in spool)) return commandFailure(spool);
      /** Reads from the offset authenticated with the retained spool, without a second decode race. */
      const page = await this.readPage(spool.spool, spool.byteOffset, (record) => {
        /** Finds the path delimiter in the Git grep record. */
        const first = record.indexOf(0);
        /** Finds the line-number delimiter in the Git grep record. */
        const second = record.indexOf(0, first + 1);
        if (first < 0 || second < 0) return undefined;
        /** Builds the commit prefix required by the Git grep record. */
        const prefix = Buffer.from(`${request.repository.commitSha}:`);
        if (!record.subarray(0, prefix.length).equals(prefix)) return undefined;
        /** Decodes the repository path from the Git grep record. */
        const path = decodeRepositoryPath(record.subarray(prefix.length, first));
        if (path === undefined) return undefined;
        /** Parses the one-based source line from the Git grep record. */
        const line = Number(record.subarray(first + 1, second).toString('utf8'));
        if (!Number.isSafeInteger(line) || line < 1) return undefined;
        return {
          path,
          line,
          text: record.subarray(second + 1, record.length - 1).toString('utf8'),
        };
      });
      if (!('items' in page)) {
        await this.removeSpool(spool.spool);
        return commandFailure(page);
      }
      if (page.nextOffset === undefined) {
        await this.removeSpool(spool.spool);
        return { status: 'complete', items: page.items };
      }
      return {
        status: 'incomplete',
        items: page.items,
        nextCursor: this.continuation(spool.spool, page.nextOffset),
      };
    } catch (_error: unknown) {
      return failure('local_git_operational_failure', 'Local Git operation failed.', true);
    }
  }

  /** Lists a full immutable tree once, then pages its NUL-delimited spool. */
  public async listSourcePage(request: SourcePageRequest): Promise<PageResult<SourcePath>> {
    try {
      if (isLeft(sourcePageRequestRt.decode(request)) || !isCursorPath(request.path))
        return failure('invalid_source_page_request', 'Source page request is invalid.', false);
      /** Binds tree continuations to traversal shape. */
      const fingerprint = cursorRequest({
        path: request.path ?? null,
        recursive: request.recursive ?? false,
      });
      /** Selects the configured mapping for the requested repository. */
      const mapping = this.configuration.repositories.get(request.repository.repository);
      if (mapping === undefined)
        return failure(
          'repository_not_configured',
          'Repository is not configured for local access.',
          false
        );
      /** Verifies repository identity before listing source paths. */
      const verified = await verifyBareRepository(this.configuration, mapping);
      if (verified !== true) return commandFailure(verified);
      /** Asks Git for unambiguous NUL-delimited repository paths. */
      const args = ['ls-tree', '-z', '--name-only'];
      if (request.recursive) args.push('-r');
      args.push(request.repository.commitSha, '--');
      if (request.path !== undefined) args.push(`:(literal)${request.path}`);
      /** Resolves the initial or continuation spool for this tree request. */
      const spool = await this.spoolForRequest(
        mapping,
        'tree',
        args,
        request.repository,
        fingerprint,
        request.cursor
      );
      if (!('spool' in spool)) return commandFailure(spool);
      /** Reads from the offset authenticated with the retained spool, without a second decode race. */
      const page = await this.readPage(spool.spool, spool.byteOffset, (record) => {
        /** Decodes the repository path from the tree record. */
        const path = decodeRepositoryPath(record.subarray(0, record.length - 1));
        return path === undefined ? undefined : { path };
      });
      if (!('items' in page)) {
        await this.removeSpool(spool.spool);
        return commandFailure(page);
      }
      if (page.nextOffset === undefined) {
        await this.removeSpool(spool.spool);
        return { status: 'complete', items: page.items };
      }
      return {
        status: 'incomplete',
        items: page.items,
        nextCursor: this.continuation(spool.spool, page.nextOffset),
      };
    } catch (_error: unknown) {
      return failure('local_git_operational_failure', 'Local Git operation failed.', true);
    }
  }

  /** Reads a bounded source window directly, without a checkout or customer code execution. */
  public async readWindow(request: SourceWindowRequest): Promise<OperationResult<SourceWindow>> {
    try {
      if (isLeft(sourceWindowRequestRt.decode(request)))
        return failure('invalid_source_window_request', 'Source window request is invalid.', false);
      /** Selects the configured mapping for the source window request. */
      const mapping = this.configuration.repositories.get(request.repository.repository);
      if (mapping === undefined)
        return failure(
          'repository_not_configured',
          'Repository is not configured for local access.',
          false
        );
      /** Verifies repository identity before reading the source blob. */
      const verified = await verifyBareRepository(this.configuration, mapping);
      if (verified !== true) return commandFailure(verified);
      /** Names the immutable Git object selected by the validated source path. */
      const object = `${request.repository.commitSha}:${request.path}`;
      /** Reads type and content through the repository's serialized long-lived batch process. */
      const output = await this.batchReader(mapping.bareRepositoryPath).read(object, request);
      if (output === 'not_blob')
        return failure('source_path_not_blob', 'Requested source path is not a blob.', false);
      if (isSourceWindowFailure(output)) return commandFailure(output);
      /** Treats the streamed output as the requested bounded source lines. */
      const lines = output;
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
      return failure('local_git_operational_failure', 'Local Git operation failed.', true);
    }
  }
}
