/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useRef } from 'react';
import { markOnce, measureSince } from '../utils/perf_marks';

interface UseReadyMarkParams {
  mark: string;
  measure: string;
  loading: boolean;
  // Gate on success so a failed request can't record a misleadingly fast time.
  succeeded: boolean;
}

// Records a one-shot mark + `measureSince(navigationStart)` the first time a
// fetch transitions from loading to a successful settle. Shared by the Hosts
// page fetchers so their perf marks use identical success-only semantics.
export const useReadyMark = ({ mark, measure, loading, succeeded }: UseReadyMarkParams) => {
  const markedRef = useRef(false);
  const prevLoadingRef = useRef<boolean | null>(null);

  useEffect(() => {
    if (prevLoadingRef.current === true && !loading && succeeded && !markedRef.current) {
      markOnce(mark);
      measureSince(measure, 'infra.hosts.navigationStart');
      markedRef.current = true;
    }
    prevLoadingRef.current = loading;
  }, [loading, succeeded, mark, measure]);
};
