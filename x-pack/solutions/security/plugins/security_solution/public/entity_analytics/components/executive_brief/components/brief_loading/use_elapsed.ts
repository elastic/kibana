/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';

/** Milliseconds elapsed since `since` (ISO), refreshed every second while `isRunning`. */
export const useElapsedMs = (since: string | undefined, isRunning: boolean): number => {
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    if (!isRunning) return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [isRunning]);

  const start = since ? Date.parse(since) : NaN;
  return Number.isFinite(start) ? Math.max(0, now - start) : 0;
};
