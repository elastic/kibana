/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useQuery } from '@kbn/react-query';
import { getESQLResults } from '@kbn/esql-utils';
import { esqlResponseToRecords } from '../../../common/utils/esql';
import { useKibana } from '../../../common/lib/kibana';

const FIELD = 'event.ingested';

export interface UseIntegrationsLastAlertIngestedParams {
  /**
   * List of installed EASE integrations
   */
  integrationName: string;
}

export interface UseIntegrationsLastAlertIngestedResult {
  /**
   * Is true while the data is loading
   */
  isLoading: boolean;
  /**
   * The time at which the last alert was ingested in the integration.
   */
  lastAlertIngested: string | null;
  /**
   * Refetch function from useQuery to manually refetching.
   */
  refetch: () => void;
}

/**
 * Hook that fetches the last alert ingested time for a specific integration.
 * We use the index pattern `logs-{integrationName}.*-*` to query.
 */
export const useIntegrationLastAlertIngested = ({
  integrationName,
}: UseIntegrationsLastAlertIngestedParams): UseIntegrationsLastAlertIngestedResult => {
  const { data } = useKibana().services;

  // ESQL query to get the last alert ingested in the index
  // We only keep the event.ingested field as it contains the time we want to display on the Integration card.
  // The first * is to support `alert` and `offense`.
  // The second * is to support all the datastream namespaces tied to the integration.
  const query = useMemo(
    () => `FROM ${`logs-${integrationName}.*-*`}
    | WHERE event.kind == "alert" OR event.kind == "event"
    | SORT ${FIELD} DESC
    | KEEP ${FIELD}
    | LIMIT 1`,
    [integrationName]
  );

  const {
    isLoading,
    data: result,
    refetch,
  } = useQuery(
    [integrationName],
    async ({ signal }) =>
      getESQLResults({
        esqlQuery: query,
        search: data.search.search,
        signal,
      }),
    {
      refetchOnWindowFocus: false,
      keepPreviousData: true,
    }
  );

  const lastAlertIngested: string | null = useMemo(() => {
    const records = esqlResponseToRecords<{ [FIELD]: string }>(result?.response);
    return records.length > 0 ? records[0][FIELD] : null;
  }, [result?.response]);

  return useMemo(
    () => ({
      isLoading,
      lastAlertIngested,
      refetch,
    }),
    [isLoading, lastAlertIngested, refetch]
  );
};
