/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';
import { getESQLResults } from '@kbn/esql-utils';
import { getPrivilegedMonitorUsersIndex } from '../../../../../common/entity_analytics/privilege_monitoring/constants';
import { esqlResponseToRecords } from '../../../../common/utils/esql';
import { useKibana } from '../../../../common/lib/kibana';

const getLatestCSVPrivilegedUserUploadQuery = (namespace: string) => {
  return `FROM ${getPrivilegedMonitorUsersIndex(namespace)}
    | WHERE labels.sources == "csv"
    | STATS latest_timestamp = MAX(@timestamp)`;
};

const GET_LATEST_CSV_UPLOAD_QUERY_ID = 'getPrivilegedUserMonitoringLatestCsvQuery';

export const useGetLatestCSVPrivilegedUserUploadQuery = (namespace: string) => {
  const search = useKibana().services.data.search.search;

  const { isLoading, data, isError, refetch } = useQuery(
    [GET_LATEST_CSV_UPLOAD_QUERY_ID],
    async ({ signal }) => {
      return esqlResponseToRecords<{ latest_timestamp: string }>(
        (
          await getESQLResults({
            esqlQuery: getLatestCSVPrivilegedUserUploadQuery(namespace),
            search,
            signal,
          })
        )?.response
      );
    }
  );
  const latestTimestamp = data ? data.find(Boolean)?.latest_timestamp : undefined;
  return {
    latestTimestamp,
    isLoading,
    isError,
    refetch,
  };
};
