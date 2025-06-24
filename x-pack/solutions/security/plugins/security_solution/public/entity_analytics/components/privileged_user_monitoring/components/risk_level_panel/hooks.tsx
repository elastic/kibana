/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { getESQLResults, prettifyQuery } from '@kbn/esql-utils';
import { useQuery } from '@tanstack/react-query';
import { i18n } from '@kbn/i18n';
import { EuiText, type EuiBasicTableColumn } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { useErrorToast } from '../../../../../common/hooks/use_error_toast';
import { useEsqlGlobalFilterQuery } from '../../../../../common/hooks/esql/use_esql_global_filter';
import { useKibana } from '../../../../../common/lib/kibana';
import { useGetDefaultRiskIndex } from '../../../../hooks/use_get_default_risk_index';
import type { RiskLevelsTableItem, RiskLevelsPrivilegedUsersQueryResult } from './types';
import { RiskScoreLevel } from '../../../severity/common';
import type { RiskSeverity } from '../../../../../../common/search_strategy';
import { esqlResponseToRecords } from '../../../../../common/utils/esql';
import { getRiskLevelsPrivilegedUsersQueryBody } from './esql_query';

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
    isLoading,
    isRefetching,
    data: result,
    error,
    isError,
    refetch,
  } = useQuery(
    [filterQuery, query],
    async ({ signal }) =>
      getESQLResults({
        esqlQuery: query,
        search: data.search.search,
        signal,
        filter: filterQuery,
      }),
    {
      keepPreviousData: true,
      enabled: !skip,
    }
  );

  useErrorToast(
    i18n.translate(
      'xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.riskLevels.queryError',
      {
        defaultMessage: 'There was an error loading the data',
      }
    ),
    error
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

  return {
    records: esqlResponseToRecords<RiskLevelsPrivilegedUsersQueryResult>(response),
    isLoading: isLoading || isRefetching,
    refetch,
    inspect,
    error,
    isRefetching,
    isError,
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
