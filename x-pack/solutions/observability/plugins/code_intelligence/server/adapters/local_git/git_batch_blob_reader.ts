/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SourceWindowRequest } from '../../domain';
import type { GitCommandFailure } from './local_bare_git_helpers';
import { spawnGit, terminateGitWithEscalation } from './local_bare_git_helpers';

const MAX_RECORD_BYTES = 1_048_576;
const MAX_SOURCE_WINDOW_BYTES = 16 * 1024 * 1024;

/** Leaves a warm batch process alive briefly so concurrent discovery windows share one Git child. */
const BATCH_IDLE_TIMEOUT_MS = 1_000;

/** Reads blob headers and content through one serialized `git cat-file --batch` session. */
export class GitBatchBlobReader {
  private child: ReturnType<typeof spawnGit> | undefined;
  private iterator: AsyncIterator<Buffer> | undefined;
  private remainder: Buffer = Buffer.alloc(0);
  private queue: Promise<void> = Promise.resolve();
  private idleTimer: NodeJS.Timeout | undefined;

  /** Binds one reusable batch session to a trusted bare repository. */
  constructor(private readonly bareRepositoryPath: string, private readonly timeoutMs: number) {}

  /** Serializes protocol requests because batch responses carry no independent request identifier. */
  public read(
    object: string,
    request: SourceWindowRequest
  ): Promise<readonly string[] | GitCommandFailure | 'not_blob'> {
    /** Starts after every prior protocol response has been consumed in full. */
    const result = this.queue.then(() => this.readSerialized(object, request));
    this.queue = result.then(
      () => undefined,
      () => undefined
    );
    return result;
  }

  /** Starts the reusable Git child and its single stdout iterator on demand. */
  private async session(): Promise<ReturnType<typeof spawnGit>> {
    if (this.child !== undefined) return this.child;
    /** Starts one fixed batch command for all source windows in this repository. */
    const child = spawnGit(this.bareRepositoryPath, ['cat-file', '--batch']);
    /** Prevents bounded Git diagnostics from blocking a long-lived child. */
    child.stderr.resume();
    /** Prevents an unobserved stdin error from terminating the process. */
    child.stdin.on('error', () => undefined);
    await new Promise<void>((resolve, reject) => {
      child.once('spawn', resolve);
      child.once('error', reject);
    });
    this.child = child;
    this.iterator = child.stdout[Symbol.asyncIterator]() as AsyncIterator<Buffer>;
    this.remainder = Buffer.alloc(0);
    child.once('close', () => {
      if (this.child !== child) return;
      this.child = undefined;
      this.iterator = undefined;
      this.remainder = Buffer.alloc(0);
    });
    return child;
  }

  /** Stops and forgets the active batch process after failure or idle expiry. */
  private stopSession(): void {
    if (this.idleTimer !== undefined) clearTimeout(this.idleTimer);
    this.idleTimer = undefined;
    /** Retains the selected child while clearing state before its asynchronous close event. */
    const child = this.child;
    this.child = undefined;
    this.iterator = undefined;
    this.remainder = Buffer.alloc(0);
    if (child !== undefined) terminateGitWithEscalation(child);
  }

  /** Schedules idle cleanup without keeping an otherwise completed CLI process alive. */
  private scheduleIdleStop(): void {
    if (this.idleTimer !== undefined) clearTimeout(this.idleTimer);
    this.idleTimer = setTimeout(() => this.stopSession(), BATCH_IDLE_TIMEOUT_MS);
    this.idleTimer.unref();
  }

  /** Returns the next buffered protocol chunk without materializing a complete blob. */
  private async nextChunk(): Promise<Buffer> {
    if (this.remainder.length > 0) {
      /** Transfers ownership of the retained protocol suffix to this read. */
      const chunk = this.remainder;
      this.remainder = Buffer.alloc(0);
      return chunk;
    }
    if (this.iterator === undefined) throw new Error('Git batch output is unavailable.');
    /** Pulls one stream chunk under backpressure from the single batch iterator. */
    const next = await this.iterator.next();
    if (next.done === true) throw new Error('Git batch output ended unexpectedly.');
    return Buffer.isBuffer(next.value) ? next.value : Buffer.from(next.value);
  }

  /** Reads one newline-terminated batch header while retaining any following blob bytes. */
  private async readHeader(): Promise<string> {
    /** Accumulates only the bounded batch response header. */
    let header: Buffer = Buffer.alloc(0);
    for (;;) {
      /** Pulls enough output to find the protocol newline. */
      const chunk = await this.nextChunk();
      /** Locates the response header terminator in the newest output chunk. */
      const newline = chunk.indexOf(10);
      if (newline < 0) {
        header = Buffer.concat([header, chunk]);
        if (header.length > MAX_RECORD_BYTES)
          throw new Error('Git batch header exceeded its limit.');
        continue;
      }
      header = Buffer.concat([header, chunk.subarray(0, newline)]);
      this.remainder = chunk.subarray(newline + 1);
      return header.toString('utf8');
    }
  }

  /** Consumes an exact protocol byte count while retaining only a final over-read suffix. */
  private async discardBytes(byteLength: number): Promise<void> {
    /** Counts unread content and protocol framing bytes. */
    let remaining = byteLength;
    while (remaining > 0) {
      /** Pulls the next backpressured output chunk. */
      const chunk = await this.nextChunk();
      if (chunk.length > remaining) {
        this.remainder = chunk.subarray(remaining);
        return;
      }
      remaining -= chunk.length;
    }
  }

  /** Streams one declared blob size into only the requested inclusive line window. */
  private async readBlobWindow(
    blobBytes: number,
    request: SourceWindowRequest
  ): Promise<readonly string[] | GitCommandFailure> {
    /** Holds one uncompleted physical line only until the requested end line is reached. */
    let pending: Buffer = Buffer.alloc(0);
    /** Retains only source lines intersecting the requested bounded window. */
    const lines: string[] = [];
    /** Tracks the current one-based source line. */
    let lineNumber = 1;
    /** Counts bytes retained in the requested window. */
    let windowBytes = 0;
    /** Stops source parsing after the requested end line while still draining batch framing. */
    let completeWindow = false;
    /** Retains a typed parsing failure while the remaining blob is safely drained. */
    let parsingFailure: GitCommandFailure | undefined;
    /** Retains one physical source line under the existing line and aggregate bounds. */
    const consumeLine = (line: Buffer): void => {
      if (line.length > MAX_RECORD_BYTES) {
        parsingFailure = {
          code: 'source_line_too_large',
          message: 'Source line exceeds its explicit limit.',
          retryable: false,
        };
        completeWindow = true;
        return;
      }
      if (lineNumber >= request.startLine && lineNumber <= request.endLine) {
        if (windowBytes + line.length > MAX_SOURCE_WINDOW_BYTES) {
          parsingFailure = {
            code: 'source_window_byte_limit_exceeded',
            message: 'Requested source window exceeds its explicit byte limit.',
            retryable: false,
          };
          completeWindow = true;
          return;
        }
        windowBytes += line.length;
        lines.push(line.toString('utf8'));
      }
      lineNumber += 1;
      if (lineNumber > request.endLine) completeWindow = true;
    };
    /** Counts unread bytes from the exact blob payload declared by Git. */
    let remaining = blobBytes;
    while (remaining > 0) {
      /** Pulls one bounded stream chunk without allowing protocol framing into source content. */
      const output = await this.nextChunk();
      /** Restricts processing to bytes belonging to this blob response. */
      const chunk = output.subarray(0, Math.min(output.length, remaining));
      if (output.length > chunk.length) this.remainder = output.subarray(chunk.length);
      remaining -= chunk.length;
      if (completeWindow) continue;
      pending = Buffer.concat([pending, chunk]);
      for (;;) {
        /** Locates the next physical source-line terminator. */
        const lineEnd = pending.indexOf(10);
        if (lineEnd < 0 || completeWindow) break;
        /** Removes one complete line from the bounded pending buffer. */
        const line = pending.subarray(0, lineEnd);
        pending = pending.subarray(lineEnd + 1);
        consumeLine(line);
      }
      if (!completeWindow && pending.length > MAX_RECORD_BYTES) {
        parsingFailure = {
          code: 'source_line_too_large',
          message: 'Source line exceeds its explicit limit.',
          retryable: false,
        };
        completeWindow = true;
      }
    }
    if (!completeWindow && pending.length > 0) consumeLine(pending);
    /** Consumes Git's newline separator after the exact blob payload. */
    await this.discardBytes(1);
    return parsingFailure ?? lines;
  }

  /** Executes one complete batch request under a wall-clock deadline. */
  private async readSerialized(
    object: string,
    request: SourceWindowRequest
  ): Promise<readonly string[] | GitCommandFailure | 'not_blob'> {
    if (this.idleTimer !== undefined) clearTimeout(this.idleTimer);
    this.idleTimer = undefined;
    /** Runs the protocol exchange separately so timeout cleanup can terminate blocked stream reads. */
    const exchange = async (): Promise<readonly string[] | GitCommandFailure | 'not_blob'> => {
      /** Acquires or starts the one reusable process for this repository. */
      const child = await this.session();
      child.stdin.write(`${object}\n`);
      /** Reads the object identity, type, and size without a separate `cat-file -t` process. */
      const header = await this.readHeader();
      if (header.endsWith(' missing')) {
        return {
          code: 'git_nonzero_exit',
          message: 'Git command failed.',
          retryable: true,
        };
      }
      /** Validates Git's fixed batch header before trusting its payload size. */
      const match = /^([0-9a-f]+) ([^ ]+) ([0-9]+)$/.exec(header);
      /** Narrows the declared object size to a safe bounded integer. */
      const size = match === null ? Number.NaN : Number(match[3]);
      if (match === null || !Number.isSafeInteger(size) || size < 0) {
        throw new Error('Git batch header was malformed.');
      }
      if (match[2] !== 'blob') {
        await this.discardBytes(size + 1);
        return 'not_blob';
      }
      return this.readBlobWindow(size, request);
    };
    /** Begins one exchange before wiring its completion to timeout cleanup. */
    const exchangePromise = exchange();
    /** Resolves with a typed timeout while terminating the blocked protocol stream. */
    const timeout = new Promise<GitCommandFailure>((resolve) => {
      /** Enforces the same per-command deadline used by other local Git operations. */
      const timer = setTimeout(() => {
        this.stopSession();
        resolve({ code: 'git_timeout', message: 'Git command timed out.', retryable: true });
      }, this.timeoutMs);
      exchangePromise.finally(() => clearTimeout(timer)).catch(() => undefined);
    });
    try {
      /** Returns the first completed protocol or deadline result. */
      const result = await Promise.race([exchangePromise, timeout]);
      this.scheduleIdleStop();
      return result;
    } catch (_error: unknown) {
      this.stopSession();
      return {
        code: 'git_spawn_failure',
        message: 'Git batch command failed.',
        retryable: true,
      };
    }
  }
}
