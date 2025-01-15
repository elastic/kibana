/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useEffect, useState } from 'react';
import { IToasts } from '@kbn/core-notifications-browser';
import { HttpHandler } from '@kbn/core-http-browser';
import { isEmpty } from 'lodash/fp';

import { DataQualityCheckResult } from '../../../../types';
import {
  GetStorageResultsOpts,
  formatResultFromStorage,
  getStorageResults,
} from '../../utils/storage';

export interface UseStoredPatternResultsOpts {
  patterns: string[];
  toasts: IToasts;
  httpFetch: HttpHandler;
  isILMAvailable: boolean;
  startTime: string;
  endTime: string;
}

export type UseStoredPatternResultsReturnValue = Array<{
  pattern: string;
  results: Record<string, DataQualityCheckResult>;
}>;

export const useStoredPatternResults = ({
  patterns,
  toasts,
  httpFetch,
  isILMAvailable,
  startTime,
  endTime,
}: UseStoredPatternResultsOpts): UseStoredPatternResultsReturnValue => {
  const [storedPatternResults, setStoredPatternResults] = useState<
    Array<{ pattern: string; results: Record<string, DataQualityCheckResult> }>
  >([]);

  useEffect(() => {
    if (isEmpty(patterns)) {
      return;
    }

    const abortController = new AbortController();
    const fetchStoredPatternResults = async () => {
      const requests = patterns.map(async (pattern) => {
        const getStorageResultsOpts: GetStorageResultsOpts = {
          pattern,
          httpFetch,
          abortController,
          toasts,
        };

        if (!isILMAvailable) {
          getStorageResultsOpts.startTime = startTime;
          getStorageResultsOpts.endTime = endTime;
        }

        return getStorageResults(getStorageResultsOpts).then((results) => ({
          pattern,
          results: Object.fromEntries(
            results.map((storageResult) => [
              storageResult.indexName,
              formatResultFromStorage({ storageResult, pattern }),
            ])
          ),
        }));
      });

      const patternResults = await Promise.all(requests);
      if (patternResults?.length) {
        setStoredPatternResults(patternResults);
      }
    };

    fetchStoredPatternResults();
  }, [endTime, httpFetch, isILMAvailable, patterns, startTime, toasts]);

  return storedPatternResults;
};
