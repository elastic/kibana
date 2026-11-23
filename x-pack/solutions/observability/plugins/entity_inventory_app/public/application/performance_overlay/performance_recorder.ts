/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject } from 'rxjs';
import type { Observable } from 'rxjs';
import type { ListResponse } from '@kbn/entity-inventory-plugin/common';

export const PERFORMANCE_RECORDER_CAPACITY = 20;

export type RecordedCallStatus = 'ok' | 'error' | 'aborted';

/** The diagnostics of one `_list` response; the rows are not kept. */
export type ListCallDiagnostics = Pick<
  ListResponse,
  'queries' | 'probes' | 'timings' | 'truncated' | 'unavailableColumns'
> & {
  rowCount: number;
};

/** One call through the inventory API client. */
export interface RecordedCall {
  id: number;
  /** A short name of the route, such as `types` or `host/_list`. */
  route: string;
  /** Epoch milliseconds when the call started. */
  startedAt: number;
  /** Browser time around the fetch: network, server and JSON parsing, in fractional milliseconds. */
  browserMs: number;
  status: RecordedCallStatus;
  /** The server's own total, when the response reports one. */
  serverMs: number | null;
  errorMessage: string | null;
  /** Present on a successful `_list` call. */
  list: ListCallDiagnostics | null;
}

export type RecordedCallInput = Omit<RecordedCall, 'id'>;

export interface PerformanceRecorder {
  /** The recorded calls, newest first, at most `capacity` of them. */
  readonly calls$: Observable<readonly RecordedCall[]>;
  getCalls(): readonly RecordedCall[];
  record(call: RecordedCallInput): void;
  clear(): void;
}

/** A bounded in-memory buffer of the latest API calls, for the performance overlay. */
export const createPerformanceRecorder = (
  capacity: number = PERFORMANCE_RECORDER_CAPACITY
): PerformanceRecorder => {
  const calls$ = new BehaviorSubject<readonly RecordedCall[]>([]);
  let nextId = 1;

  return {
    calls$: calls$.asObservable(),
    getCalls: () => calls$.getValue(),
    record: (call) => {
      calls$.next([{ ...call, id: nextId++ }, ...calls$.getValue()].slice(0, capacity));
    },
    clear: () => calls$.next([]),
  };
};
