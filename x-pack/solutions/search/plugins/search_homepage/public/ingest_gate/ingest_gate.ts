/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject } from 'rxjs';
import type { Observable } from 'rxjs';

/** `unknown` until the cluster has answered; `open` also when the gate does not apply or the check failed. */
export type IngestGateStatus = 'unknown' | 'gated' | 'open';

export interface IngestGateParams {
  /** Whether the Elasticsearch solution is the active experience. A rejection counts as no. */
  isInScope: () => Promise<boolean>;
  /** Asks the cluster whether it holds data. A rejection opens the gate. */
  fetchHasData: () => Promise<boolean>;
  /** Opens the gate without asking the cluster, for a browser that has already seen data. */
  hasSeenData: boolean;
  pollIntervalMs: number;
  /** Polls are skipped, not queued, while the page is not visible. */
  isPageVisible?: () => boolean;
}

export interface IngestGate {
  status$: Observable<IngestGateStatus>;
  getStatus: () => IngestGateStatus;
  /** Takes an answer the caller got from the cluster itself, sparing a request. */
  reportHasData: (hasData: boolean) => void;
  /** Asks the cluster now, and resolves with the status that follows from its answer. */
  recheck: () => Promise<IngestGateStatus>;
  stop: () => void;
}

/**
 * Holds the deployment behind the ingest step until the cluster reports data. Only a cluster answer
 * closes the gate; it polls while closed and stops asking once it opens.
 */
export const createIngestGate = ({
  isInScope,
  fetchHasData,
  hasSeenData,
  pollIntervalMs,
  isPageVisible = () => true,
}: IngestGateParams): IngestGate => {
  const status$ = new BehaviorSubject<IngestGateStatus>('unknown');
  let inScope: boolean | undefined;
  let reportedBeforeScope: boolean | undefined;
  let pollTimer: ReturnType<typeof setTimeout> | undefined;
  let isStopped = false;

  const setStatus = (status: IngestGateStatus): void => {
    if (status !== status$.getValue()) {
      status$.next(status);
    }
  };

  const clearPoll = (): void => {
    if (pollTimer !== undefined) {
      clearTimeout(pollTimer);
      pollTimer = undefined;
    }
  };

  const check = async (): Promise<IngestGateStatus> => {
    clearPoll();
    try {
      applyAnswer(await fetchHasData());
    } catch {
      // Not knowing must never hold the user back, so a failed check opens the gate.
      if (!isStopped) {
        clearPoll();
        setStatus('open');
      }
    }
    return status$.getValue();
  };

  const schedulePoll = (): void => {
    clearPoll();
    pollTimer = setTimeout(() => {
      if (isPageVisible()) {
        check();
      } else {
        schedulePoll();
      }
    }, pollIntervalMs);
  };

  const applyAnswer = (hasData: boolean): void => {
    if (isStopped || inScope !== true) {
      return;
    }
    if (hasData) {
      clearPoll();
      setStatus('open');
      return;
    }
    setStatus('gated');
    schedulePoll();
  };

  const resolveScope = async (): Promise<void> => {
    try {
      inScope = await isInScope();
    } catch {
      inScope = false;
    }
    if (isStopped) {
      return;
    }
    if (!inScope) {
      setStatus('open');
    } else if (reportedBeforeScope !== undefined) {
      applyAnswer(reportedBeforeScope);
    } else if (hasSeenData) {
      setStatus('open');
    } else {
      await check();
    }
  };

  resolveScope();

  return {
    status$: status$.asObservable(),
    getStatus: () => status$.getValue(),
    reportHasData: (hasData) => {
      if (inScope === undefined) {
        reportedBeforeScope = hasData;
        return;
      }
      applyAnswer(hasData);
    },
    recheck: async () => (inScope === true && !isStopped ? check() : status$.getValue()),
    stop: () => {
      isStopped = true;
      clearPoll();
      status$.complete();
    },
  };
};
