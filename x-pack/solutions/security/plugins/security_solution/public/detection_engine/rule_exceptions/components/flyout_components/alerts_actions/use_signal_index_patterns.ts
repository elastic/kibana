/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';

import type { DataViewBase } from '@kbn/es-query';

import { useSignalIndex } from '../../../../../detections/containers/detection_engine/alerts/use_signal_index';
import { useFetchIndex } from '../../../../../common/containers/source';

export interface SignalIndexPatterns {
  /** The signal index *name* request is in flight. */
  isSignalIndexLoading: boolean;
  signalIndexNames: string[];
  /** The signal index *fields* request is in flight. */
  isSignalIndexPatternLoading: boolean;
  signalIndexPatterns: DataViewBase;
  /**
   * True once `signalIndexPatterns` is usable: both requests above settled
   * successfully. Success is only observable through a fetched `dataView` —
   * `useFetchIndex` reports `loading: false` with a non-null empty-fields
   * stub both before its effect kicks off the fetch and after a fetch
   * error. That means this stays false forever if either request fails;
   * deliberate, since the fields can't be trusted then (`useFetchIndex`
   * surfaces the failure in an error toast).
   */
  areSignalIndexPatternsReady: boolean;
}

/**
 * The alerts-index context the exception flyouts share: the signal index
 * name and its fields. Both underlying hooks fire one HTTP request per
 * instance, so call this once per flyout and pass the results down.
 */
export const useSignalIndexPatterns = (): SignalIndexPatterns => {
  const { loading: isSignalIndexLoading, signalIndexName } = useSignalIndex();
  const signalIndexNames = useMemo(
    () => (signalIndexName !== null ? [signalIndexName] : []),
    [signalIndexName]
  );

  const [
    isSignalIndexPatternLoading,
    { indexPatterns: signalIndexPatterns, dataView: signalDataView },
  ] = useFetchIndex(signalIndexNames);

  return {
    isSignalIndexLoading,
    signalIndexNames,
    isSignalIndexPatternLoading,
    signalIndexPatterns,
    areSignalIndexPatternsReady:
      !isSignalIndexLoading && !isSignalIndexPatternLoading && signalDataView != null,
  };
};
