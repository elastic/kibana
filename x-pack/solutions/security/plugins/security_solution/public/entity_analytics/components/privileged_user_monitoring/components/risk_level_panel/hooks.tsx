/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo } from 'react';
import { getESQLResults, prettifyQuery } from '@kbn/esql-utils';
import { useQuery } from '@tanstack/react-query';
import { i18n } from '@kbn/i18n';
import { EuiText, type EuiBasicTableColumn } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { SecurityAppError } from '@kbn/securitysolution-t-grid';
import type { ESQLSearchParams, ESQLSearchResponse } from '@kbn/es-types';
import { useRiskEngineStatus } from '../../../../api/hooks/use_risk_engine_status';
import { useErrorToast } from '../../../../../common/hooks/use_error_toast';
import { useEsqlGlobalFilterQuery } from '../../../../../common/hooks/esql/use_esql_global_filter';
import { useKibana } from '../../../../../common/lib/kibana';
import { useGetDefaultRiskIndex } from '../../../../hooks/use_get_default_risk_index';
import type { RiskLevelsTableItem, RiskLevelsPrivilegedUsersQueryResult } from './types';
import { RiskScoreLevel } from '../../../severity/common';
import type { RiskSeverity } from '../../../../../../common/search_strategy';
import { esqlResponseToRecords } from '../../../../../common/utils/esql';
import { getRiskLevelsPrivilegedUsersQueryBody } from '../../queries/risk_level_esql_query';

export const useRiskLevelsPrivilegedUserQuery = ({
  skip,
  spaceId,
}: {
  skip: boolean;
  spaceId: string;
}) => {
  const { data } = useKibana().services;

  const index = useGetDefaultRiskIndex(true); // only latest
  const filterQuery = useEsqlGlobalFilterQuery();

  const query = `FROM ${index} ${getRiskLevelsPrivilegedUsersQueryBody(spaceId)}`;

  const {
    data: riskEngineStatus,
    isFetching: isStatusLoading,
    refetch: refetchEngineStatus,
  } = useRiskEngineStatus();

  const {
    isRefetching,
    data: result,
    error,
    isError,
    refetch,
  } = useQuery<
    {
      response: ESQLSearchResponse;
      params: ESQLSearchParams;
    },
    SecurityAppError
  >(
    [], // query doesn't need a key since it is only run when refetch is called
    async ({ signal }) =>
      getESQLResults({
        esqlQuery: query,
        search: data.search.search,
        signal,
        filter: filterQuery,
      }),
    {
      keepPreviousData: true,
      enabled: false,
      retry: 1, // retry once on failure
    }
  );

  // Hide unknown index errors from UI because they index might take some time to be created
  const filteredError = error && !error.message.includes('Unknown index') ? error : undefined;

  useErrorToast(
    i18n.translate(
      'xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.riskLevels.queryError',
      {
        defaultMessage: 'There was an error loading the data',
      }
    ),
    filteredError
  );

  const response = result?.response;

  const inspect = useMemo(() => {
    return {
      dsl: [
        JSON.stringify(
          { index: index ? [index] : [''], body: prettifyQuery(query, false) },
          null,
          2
        ),
      ],
      response: response ? [JSON.stringify(response, null, 2)] : [],
    };
  }, [index, query, response]);

  // Fetch risk score when components mounts or when the risk engine status changes
  useEffect(() => {
    if (!skip && !isStatusLoading && riskEngineStatus?.risk_engine_status !== 'NOT_INSTALLED') {
      refetch();
    }
  }, [riskEngineStatus, isStatusLoading, refetch, skip]);

  return {
    records: esqlResponseToRecords<RiskLevelsPrivilegedUsersQueryResult>(response),
    isLoading: isRefetching || isStatusLoading,
    refetch: refetchEngineStatus, // refetching the status will force the risk score to be fetched,
    inspect,
    error,
    isRefetching,
    isError,
    hasEngineBeenInstalled: riskEngineStatus?.risk_engine_status !== 'NOT_INSTALLED',
  };
};

export const useRiskLevelsTableColumns = () => {
  return useMemo(
    (): Array<EuiBasicTableColumn<RiskLevelsTableItem>> => [
      {
        field: 'level',
        name: (
          <FormattedMessage
            id="xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.riskLevels.riskLevelColumn"
            defaultMessage="Risk level"
          />
        ),
        truncateText: true,
        render: (level: RiskSeverity) => (
          <EuiText size="xs">
            <RiskScoreLevel hideBackgroundColor severity={level} />
          </EuiText>
        ),
      },
      {
        field: 'count',
        name: (
          <FormattedMessage
            id="xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.riskLevels.numberOfUsersColumn"
            defaultMessage="Number of users"
          />
        ),
        dataType: 'number',
      },
      {
        field: 'percentage',
        name: (
          <FormattedMessage
            id="xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.riskLevels.percentageColumn"
            defaultMessage="% of users"
          />
        ),
        align: 'right',
        render: (percentage: number) => `${Math.round(percentage)}%`,
      },
    ],
    []
  );
};
