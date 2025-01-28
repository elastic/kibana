/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { OnTimeChangeProps } from '@elastic/eui';

import { useAbortControllerRef } from '../../../../../../../hooks/use_abort_controller_ref';
import { useIsMountedRef } from '../../../../../../../hooks/use_is_mounted_ref';
import { FetchHistoricalResultsQueryState } from '../../../types';
import { FetchHistoricalResultsQueryAction } from '../../types';
import { useHistoricalResultsContext } from '../../../../contexts/historical_results_context';

export interface UseHistoricalResultsDatePickerOpts {
  indexName: string;
  fetchHistoricalResultsQueryState: FetchHistoricalResultsQueryState;
  fetchHistoricalResultsQueryDispatch: React.Dispatch<FetchHistoricalResultsQueryAction>;
}

export interface UseHistoricalResultsDatePickerReturnValue {
  handleTimeChange: ({ start, end, isInvalid }: OnTimeChangeProps) => Promise<void>;
}

export const useHistoricalResultsDatePicker = ({
  indexName,
  fetchHistoricalResultsQueryState,
  fetchHistoricalResultsQueryDispatch,
}: UseHistoricalResultsDatePickerOpts): UseHistoricalResultsDatePickerReturnValue => {
  const fetchHistoricalResultsFromDateAbortControllerRef = useAbortControllerRef();
  const { fetchHistoricalResults } = useHistoricalResultsContext();
  const { isMountedRef } = useIsMountedRef();

  const handleTimeChange = useCallback(
    async ({ start, end, isInvalid }: OnTimeChangeProps) => {
      if (isInvalid) {
        return;
      }

      await fetchHistoricalResults({
        abortController: fetchHistoricalResultsFromDateAbortControllerRef.current,
        indexName,
        size: fetchHistoricalResultsQueryState.size,
        from: 0,
        startDate: start,
        endDate: end,
        ...(fetchHistoricalResultsQueryState.outcome && {
          outcome: fetchHistoricalResultsQueryState.outcome,
        }),
      });

      if (isMountedRef.current) {
        fetchHistoricalResultsQueryDispatch({
          type: 'SET_DATE',
          payload: { startDate: start, endDate: end },
        });
      }
    },
    [
      fetchHistoricalResults,
      fetchHistoricalResultsFromDateAbortControllerRef,
      fetchHistoricalResultsQueryDispatch,
      fetchHistoricalResultsQueryState.outcome,
      fetchHistoricalResultsQueryState.size,
      indexName,
      isMountedRef,
    ]
  );

  return {
    handleTimeChange,
  };
};
