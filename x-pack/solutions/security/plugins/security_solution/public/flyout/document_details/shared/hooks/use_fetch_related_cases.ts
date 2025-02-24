/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';
import type { GetRelatedCasesByAlertResponse } from '@kbn/cases-plugin/common';
import { useMemo } from 'react';
import { useKibana } from '../../../../common/lib/kibana';
import { APP_ID } from '../../../../../common/constants';

const QUERY_KEY = 'useFetchRelatedCases';

export interface UseFetchRelatedCasesParams {
  /**
   * Id of the document
   */
  eventId: string;
}

export interface UseFetchRelatedCasesResult {
  /**
   * Returns true while data is loading
   */
  loading: boolean;
  /**
   * Returns true if there is an error while retrieving data
   */
  error: boolean;
  /**
   * Cases data retrieved
   */
  data: GetRelatedCasesByAlertResponse;
  /**
   * Number of data entries received
   */
  dataCount: number;
}

/**
 * Returns the number of cases related to a document id (and the loading, error statuses as well as the cases count)
 */
export const useFetchRelatedCases = ({
  eventId,
}: UseFetchRelatedCasesParams): UseFetchRelatedCasesResult => {
  const {
    services: { cases },
  } = useKibana();
  const { data, isLoading, isError } = useQuery<GetRelatedCasesByAlertResponse | undefined>(
    [QUERY_KEY, eventId],
    () =>
      cases.api.getRelatedCases(eventId, {
        owner: APP_ID,
      }),
    { keepPreviousData: true }
  );

  return useMemo(
    () => ({
      loading: isLoading,
      error: isError,
      data: data || [],
      dataCount: data?.length || 0,
    }),
    [data, isError, isLoading]
  );
};
