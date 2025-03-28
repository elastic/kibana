/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo } from 'react';
import { EuiBasicTable, EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner } from '@elastic/eui';
import { SecurityPageName } from '@kbn/deeplinks-security';
import { useQuery } from '@tanstack/react-query';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { getESQLResults } from '@kbn/esql-utils';
import { useSourcererDataView } from '../../sourcerer/containers';
import { SecuritySolutionPageWrapper } from '../../common/components/page_wrapper';
import { HeaderPage } from '../../common/components/header_page';
import { SiemSearchBar } from '../../common/components/search_bar';
import { InputsModelId } from '../../common/store/inputs/constants';
import { FiltersGlobal } from '../../common/components/filters_global';
import { SpyRoute } from '../../common/utils/route/spy_routes';
import { VisualizationEmbeddable } from '../../common/components/visualization_actions/visualization_embeddable';
import { useGlobalTime } from '../../common/containers/use_global_time';
import { getLensAttributes } from './get_lens_attributes';
import { useKibana } from '../../common/lib/kibana';

const SUDO_COUNT_ESQL_STACKED = `FROM commands-privtest
| RENAME @timestamp AS event_timestamp
| LOOKUP JOIN privileged-users ON user.name
| WHERE MATCH(message, \"sudo su\") 
| RENAME event_timestamp AS @timestamp
| EVAL is_privileged = COALESCE(labels.is_privileged, false)
| EVAL privileged_status = CASE(is_privileged, \"privileged\", \"not_privileged\")
| EVAL timestamp=DATE_TRUNC(30 second, @timestamp)
| stats results = COUNT(*) by timestamp, user.name`;

const PRIVILEGED_USER_LIST_ESQL = `FROM commands-privtest
| RENAME @timestamp AS event_timestamp
| LOOKUP JOIN privileged-users ON user.name
| RENAME event_timestamp AS @timestamp
| EVAL is_privileged = COALESCE(labels.is_privileged, false)
| WHERE is_privileged == true
| STATS
    name = MAX(user.name),
    @timestamp = MAX(@timestamp)
    BY user.name
| KEEP @timestamp, user.name`;

// using helpers
const fetchESQLSimple = async (data: DataPublicPluginStart, signal?: AbortSignal) => {
  return getESQLResults({
    esqlQuery: PRIVILEGED_USER_LIST_ESQL,
    search: data.search.search,
    signal,
  });
};

// I copied this function from the ESQL helper
function toRecords(response) {
  if (!response) return [];
  const { columns, values } = response;
  return values.map((row) => {
    const doc = {};
    row.forEach((cell, index) => {
      const { name } = columns[index];
      // @ts-expect-error
      doc[name] = cell;
    });
    return doc;
  });
}

const PrivilegedUserMonitoringComponent = () => {
  const { loading: isSourcererLoading, sourcererDataView } = useSourcererDataView();
  const { to, from } = useGlobalTime();
  const timerange = useMemo(() => ({ from, to }), [from, to]);
  const { data } = useKibana().services;

  const {
    isInitialLoading,
    isLoading,
    isError,
    isRefetching,
    data: result,
  } = useQuery({
    queryKey: [timerange],
    queryFn: async ({ signal }) => {
      return fetchESQLSimple(data, signal);
    },
    refetchOnWindowFocus: false,
  });

  const values = toRecords(result?.response);
  return (
    <>
      <FiltersGlobal>
        <SiemSearchBar id={InputsModelId.global} sourcererDataView={sourcererDataView} />
      </FiltersGlobal>

      <SecuritySolutionPageWrapper data-test-subj="entityAnalyticsPage">
        <HeaderPage title={'Privileged User Monitoring'} />

        {isSourcererLoading ? (
          <EuiLoadingSpinner size="l" data-test-subj="entityAnalyticsLoader" />
        ) : (
          <>
            <EuiFlexGroup direction="column" data-test-subj="entityAnalyticsSections">
              <VisualizationEmbeddable
                applyGlobalQueriesAndFilters={true}
                esql={SUDO_COUNT_ESQL_STACKED}
                data-test-subj="embeddable-matrix-histogram"
                getLensAttributes={getLensAttributes}
                height={155}
                id={'my-id'}
                timerange={timerange}
              />
            </EuiFlexGroup>

            <EuiFlexGroup direction="column">
              <EuiFlexItem>
                {isLoading ? (
                  <EuiLoadingSpinner size="m" />
                ) : isError ? (
                  <div>{'Error loading data'}</div>
                ) : (
                  <EuiBasicTable
                    loading={isInitialLoading || isRefetching}
                    items={values || []}
                    columns={[
                      {
                        field: 'user.name',
                        name: 'Username',
                      },
                      {
                        field: '@timestamp',
                        name: 'Timestamp',
                        dataType: 'date',

                        render: (timestamp) => {
                          return new Date(timestamp).toLocaleString();
                        },
                      },
                    ]}
                  />
                )}
              </EuiFlexItem>
            </EuiFlexGroup>
          </>
        )}
      </SecuritySolutionPageWrapper>

      <SpyRoute pageName={SecurityPageName.privilegedUserMonitoring} />
    </>
  );
};

export const PrivilegedUserMonitoringPage = React.memo(PrivilegedUserMonitoringComponent);
