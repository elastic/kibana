/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Subject } from 'rxjs';
import type { Observable } from 'rxjs';

/**
 * POC write queue in front of Core User Storage.
 *
 * Why it exists: `UserStorageClient.set` is not optimistic, debounced or serialized, and the server
 * persists with a seqNo-checked saved object `update`. Concurrent writes to the same user document
 * fail with `version_conflict_engine_exception` and the value is lost. Spike results (direct server
 * client, all writes in flight at once): 5/10 lost on a fresh document, 6/10 on an existing one,
 * 40/50 same-key writes rejected.
 *
 * What it does: keeps the latest value per key, debounces, and sends one request at a time.
 * Retries on 409 / 5xx / network errors with backoff. It never reverts: the pending value stays
 * readable via `getPending` and failures surface on `errors$`.
 *
 * Limitation: it only serializes writes within one browser tab. Two tabs can still conflict, which
 * is why 409 is retried here.
 *
 * Potential Core fix (would make this layer unnecessary for conflicts and cover multi-tab):
 * in `UserStorageClient.set` (src/core/packages/user-storage/server-internal), retry the
 * `soClient.update` on a version conflict with a small bounded backoff. Today the retry only covers
 * the create-vs-create race. Optimistic cache updates and `pagehide` flush would still belong in the
 * browser client.
 */

export interface UserSettingsWriter {
  set: <T>(key: string, value: T) => Promise<T>;
}

export interface UserSettingsWriteError {
  key: string;
  error: Error;
  /** true when the value was dropped (non-retryable error or retries exhausted) */
  dropped: boolean;
}

export interface UserSettingsWriteQueueOptions {
  writer: UserSettingsWriter;
  debounceMs?: number;
  maxRetries?: number;
  baseBackoffMs?: number;
}

const DEFAULT_DEBOUNCE_MS = 1000;
const DEFAULT_MAX_RETRIES = 5;
const DEFAULT_BASE_BACKOFF_MS = 500;
const MAX_BACKOFF_MS = 10000;

const getStatus = (error: unknown): number | undefined => {
  const { response, body, statusCode } = error as {
    response?: { status?: number };
    body?: { statusCode?: number };
    statusCode?: number;
  };
  return response?.status ?? body?.statusCode ?? statusCode;
};

/** No status means the request never got a response (network error): retry. */
const isRetryable = (error: unknown): boolean => {
  const status = getStatus(error);
  return status === undefined || status === 409 || status >= 500;
};

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export class UserSettingsWriteQueue {
  private readonly writer: UserSettingsWriter;
  private readonly debounceMs: number;
  private readonly maxRetries: number;
  private readonly baseBackoffMs: number;

  /** Latest value per key that has not been sent yet. */
  private readonly pending = new Map<string, unknown>();
  /** Values currently being sent (or retried); still readable until confirmed. */
  private readonly inFlight = new Map<string, unknown>();
  private readonly errorsSubject = new Subject<UserSettingsWriteError>();
  private readonly changesSubject = new Subject<string>();
  private timer: ReturnType<typeof setTimeout> | undefined;
  private draining: Promise<void> | undefined;

  public readonly errors$: Observable<UserSettingsWriteError>;
  /** Emits a key whenever its pending value changes or settles. */
  public readonly changes$: Observable<string>;

  constructor({
    writer,
    debounceMs = DEFAULT_DEBOUNCE_MS,
    maxRetries = DEFAULT_MAX_RETRIES,
    baseBackoffMs = DEFAULT_BASE_BACKOFF_MS,
  }: UserSettingsWriteQueueOptions) {
    this.writer = writer;
    this.debounceMs = debounceMs;
    this.maxRetries = maxRetries;
    this.baseBackoffMs = baseBackoffMs;
    this.errors$ = this.errorsSubject.asObservable();
    this.changes$ = this.changesSubject.asObservable();
  }

  /** Latest value not yet confirmed by the server, or `undefined` when the server copy is current. */
  public getPending<T>(key: string): T | undefined {
    if (this.pending.has(key)) return this.pending.get(key) as T;
    if (this.inFlight.has(key)) return this.inFlight.get(key) as T;
    return undefined;
  }

  public enqueue<T>(key: string, value: T): void {
    this.pending.set(key, value);
    this.changesSubject.next(key);
    this.schedule();
  }

  /** Sends everything now. Resolves when the queue is empty. */
  public async flush(): Promise<void> {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = undefined;
    }
    await this.drain();
  }

  /** (Re)starts the debounce timer. */
  private schedule(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.timer = undefined;
      void this.drain();
    }, this.debounceMs);
  }

  /** One drain loop at a time: this is what serializes writes. */
  private drain(): Promise<void> {
    if (!this.draining) {
      this.draining = this.run().finally(() => {
        this.draining = undefined;
        // values enqueued while the last request was finishing
        if (this.pending.size > 0 && !this.timer) this.schedule();
      });
    }
    return this.draining;
  }

  private async run(): Promise<void> {
    while (this.pending.size > 0) {
      const [key, value] = this.pending.entries().next().value as [string, unknown];
      this.pending.delete(key);
      this.inFlight.set(key, value);
      await this.writeWithRetry(key, value);
      this.inFlight.delete(key);
      this.changesSubject.next(key);
    }
  }

  private async writeWithRetry(key: string, value: unknown): Promise<void> {
    for (let attempt = 0; ; attempt++) {
      // a newer value for this key supersedes the one being retried
      if (this.pending.has(key)) return;

      try {
        await this.writer.set(key, value);
        return;
      } catch (e) {
        const error = e instanceof Error ? e : new Error(String(e));
        const exhausted = attempt >= this.maxRetries;
        if (!isRetryable(e) || exhausted) {
          this.errorsSubject.next({ key, error, dropped: true });
          return;
        }
        this.errorsSubject.next({ key, error, dropped: false });
        await sleep(Math.min(this.baseBackoffMs * 2 ** attempt, MAX_BACKOFF_MS));
      }
    }
  }
}
