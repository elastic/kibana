/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useSyncExternalStore } from 'react';

/** How long a detonation started from the flyout runs before it is done. */
export const DETONATION_JOB_DURATION_MS = 60 * 1000;

// Tiny external store. The job lives outside the flyout so it keeps running (and still notifies
// the user) when the flyout is closed while the file is being detonated.
const doneJobs = new Set<string>();
const listeners = new Set<() => void>();
let jobCounter = 0;

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/**
 * Starts a (fake) detonation. `onDone` runs when it finishes, whether or not the flyout that
 * started it is still open. Returns the job id.
 */
export const startDetonationJob = (onDone: () => void): string => {
  jobCounter += 1;
  const id = `detonation-job-${jobCounter}`;
  setTimeout(() => {
    doneJobs.add(id);
    listeners.forEach((listener) => listener());
    onDone();
  }, DETONATION_JOB_DURATION_MS);
  return id;
};

/** Whether a detonation job is done. A missing job id counts as done (nothing to wait for). */
export const useIsDetonationJobDone = (jobId?: string): boolean =>
  useSyncExternalStore(subscribe, () => jobId === undefined || doneJobs.has(jobId));
