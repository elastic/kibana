/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useRef } from 'react';
import { markOnce, measureSince } from '../utils/perf_marks';

interface UseReadyMarkParams {
  /** User Timing mark name, e.g. `infra.hosts.tableReady`. */
  mark: string;
  /** User Timing measure name, e.g. `infra.hosts.tableReadyDuration`. */
  measure: string;
  /** Whether the underlying fetch is currently in flight. */
  loading: boolean;
  /**
   * Whether the fetch settled successfully (data present, no error). Gating on
   * success keeps a failed request from recording a misleadingly fast "ready"
   * time.
   */
  succeeded: boolean;
}

/**
 * Records a one-shot mark + `measureSince(navigationStart)` the first time a
 * fetch transitions from loading to a successful settle. Shared by the Hosts
 * page fetchers (`/host`, `/host/count`, client-side KPI ES|QL) so their perf
 * marks use identical, success-only semantics.
 */
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
