/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo } from 'react';
import { EuiBasicTable, EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner } from '@elastic/eui';
import { useQuery } from '@tanstack/react-query';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { getESQLResults } from '@kbn/esql-utils';
import { buildESQLWithKQLQuery } from '../../../../../common/utils/esql';
import { VisualizationEmbeddable } from '../../../../../common/components/visualization_actions/visualization_embeddable';
import { useKibana } from '../../../../../common/lib/kibana';
import { useDeepEqualSelector } from '../../../../../common/hooks/use_selector';
import { inputsSelectors } from '../../../../../common/store';
import { getLensAttributes } from './get_lens_attributes';

const FROM_TIME = '2026-03-15T15:17:00.000Z';
const TO_TIME = '2026-03-16T15:17:00.000Z';
// TODO calculate this?
const TIMERANGE = {
  from: FROM_TIME,
  to: TO_TIME,
};
const FROM_TIME_DATE = new Date(FROM_TIME);
const TO_TIME_DATE = new Date(TO_TIME);

interface UserRowData {
  quantity: number;
  user: string;
  target: string;
  right: string;
  ip: string;
}

const generateRandomData = (from: Date, to: Date) => {
  const randomDate = new Date(from.getTime() + Math.random() * (to.getTime() - from.getTime()));
  return randomDate.toISOString();
};

const generateUserRowData = ({ quantity, user, target, right, ip }: UserRowData) => {
  // "admin-1,user-12345,Local Administrator,192.125.52.245,Mar 15, 2026 @15:17:23:5346"
  // loop quantity times and concatenate the string
  const userRowData = [];
  for (let i = 0; i < quantity; i++) {
    userRowData.push(
      `"${user},${target},${right},${ip},${generateRandomData(FROM_TIME_DATE, TO_TIME_DATE)}"`
    );
  }
  return userRowData.join(',');
};

const DATA: UserRowData[] = [
  {
    user: 'admin-1',
    target: 'user-12345',
    right: 'Local Administrator',
    ip: '192.125.52.245',
    quantity: 30,
  },
  {
    user: 'bhusa-win1',
    target: 'jdoe_admin',
    right: 'Global Administrator',
    ip: '143.235.125.123',
    quantity: 25,
  },
  {
    user: 'james-os',
    target: 'm.smith_sec',
    right: 'Security Administrator',
    ip: '192.186.23.253',
    quantity: 15,
  },
  {
    user: 'admin-2',
    target: 'r.wilson',
    right: 'Domain Administrator',
    ip: '192.186.23.253',
    quantity: 16,
  },
  {
    user: 'es01',
    target: 'it_support01',
    right: 'Server Operator',
    ip: '192.186.23.253',
    quantity: 12,
  },
  {
    user: 'monina-mac',
    target: 'adm-xliu',
    right: 'Billing Administrator',
    ip: '192.186.23.253',
    quantity: 11,
  },
  {
    user: 'tin',
    target: 'jane199012',
    right: 'Local Administrator',
    ip: '143.235.125.123',
    quantity: 9,
  },
  {
    user: 'monina',
    target: 'andrew.li',
    right: 'Local Administrator',
    ip: '143.235.125.123',
    quantity: 8,
  },
];

const generateESQLSource = () => {
  const rows = DATA.map((row) => generateUserRowData(row)).join(',');
  return `ROW data=[${rows}]
          | MV_EXPAND data
          | EVAL row = SPLIT(data, ",")
          | EVAL privileged_user = MV_SLICE(row, 0), target_user = MV_SLICE(row, 1), right = MV_SLICE(row, 2), ip = MV_SLICE(row, 3), @timestamp = MV_SLICE(row, 4)
          | DROP row`;
};

const generateListESQLQuery = () => `${generateESQLSource()}
      | SORT @timestamp DESC
      | LIMIT 10`;

const generateVisualizationESQLQuery = () => `${generateESQLSource()}
  | EVAL timestamp=DATE_TRUNC(1 hour, TO_DATETIME(@timestamp))
  | STATS results = COUNT(*) by timestamp, privileged_user`;

const fetchESQLSimple = async (
  esqlQuery: string,
  data: DataPublicPluginStart,
  signal: AbortSignal | undefined
  // filter: unknown
) => {
  return getESQLResults({
    esqlQuery,
    search: data.search.search,
    signal,
    // filter,
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

const PRIVILEGED_USER_LIST_ESQL = generateListESQLQuery();
const PRIVILEGED_VISUALIZATION_ESQL = generateVisualizationESQLQuery();

const PrivilegedUserMonitoringSampleDashboardComponent = () => {
  // const { to, from } = useGlobalTime();
  // const timerange = useMemo(() => ({ from, to }), [from, to]);
  const { data } = useKibana().services;
  const getGlobalQuerySelector = useMemo(() => inputsSelectors.globalQuerySelector(), []);
  const globalQuery = useDeepEqualSelector(getGlobalQuerySelector);
  // const { filterQuery } = useGlobalFilterQuery({ extraFilter: buildTimeRangeFilter(from, to) });

  const esqlQuery = useMemo(
    () => buildESQLWithKQLQuery(PRIVILEGED_USER_LIST_ESQL, globalQuery.query as string),
    [globalQuery.query]
  );

  const {
    isInitialLoading,
    isLoading,
    isError,
    isRefetching,
    data: result,
  } = useQuery({
    queryKey: [esqlQuery], // filterQuery,
    queryFn: async ({ signal }) => {
      return fetchESQLSimple(esqlQuery, data, signal);
    },
    refetchOnWindowFocus: false,
  });

  const values = toRecords(result?.response);
  return (
    <>
      <EuiFlexGroup direction="column" data-test-subj="entityAnalyticsSections">
        <VisualizationEmbeddable
          applyGlobalQueriesAndFilters={true}
          esql={PRIVILEGED_VISUALIZATION_ESQL}
          data-test-subj="embeddable-matrix-histogram"
          getLensAttributes={getLensAttributes}
          height={260}
          id={'my-id'}
          timerange={TIMERANGE}
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
                  field: 'privileged_user',
                  name: 'Privileged user',
                },
                {
                  field: 'target_user',
                  name: 'Target user',
                },
                {
                  field: 'right',
                  name: 'Granted right',
                },
                {
                  field: 'ip',
                  name: 'Source IP',
                },
                {
                  field: '@timestamp',
                  name: 'Timestamp',
                  dataType: 'date',

                  render: (timestamp: string) => {
                    return new Date(timestamp).toLocaleString();
                  },
                },
              ]}
            />
          )}
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};

export const PrivilegedUserMonitoringSampleDashboard = React.memo(
  PrivilegedUserMonitoringSampleDashboardComponent
);

// TODO HANDLE GRACEFULLY ESQL ERROR
