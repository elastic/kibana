/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Criteria,
  EuiBasicTable,
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiPanel,
  EuiSelect,
  EuiSpacer,
} from '@elastic/eui';
import { useQuery } from '@tanstack/react-query';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { getESQLResults } from '@kbn/esql-utils';
import { HoverVisibilityContainer } from '@kbn/response-ops-alerts-table/components/hover_visibility_container';
import { FormattedMessage } from '@kbn/i18n-react';
import { buildESQLWithKQLQuery } from '../../../../../common/utils/esql';
import { VisualizationEmbeddable } from '../../../../../common/components/visualization_actions/visualization_embeddable';
import { useKibana } from '../../../../../common/lib/kibana';
import { useDeepEqualSelector } from '../../../../../common/hooks/use_selector';
import { inputsSelectors } from '../../../../../common/store';
import { getLensAttributes } from './get_lens_attributes';
import { HeaderSection } from '../../../../../common/components/header_section';
import { take } from 'lodash/fp';

const TO_TIME = new Date();
const FROM_TIME = new Date(TO_TIME.getTime() - 24 * 60 * 60 * 1000);

// TODO calculate this?
const TIMERANGE = {
  from: FROM_TIME.toISOString(),
  to: TO_TIME.toISOString(),
};

interface UserRowData {
  quantity: number;
  user: string;
  target: string;
  right: string;
  ip: string;
}

export interface VisualizationStackByOption {
  text: string;
  value: string;
}

const generateRandomData = (from: Date, to: Date) => {
  const randomDate = new Date(from.getTime() + Math.random() * (to.getTime() - from.getTime()));
  return randomDate.toISOString();
};

const generateUserRowData = ({ quantity, user, target, right, ip }: UserRowData) => {
  const userRowData = [];
  for (let i = 0; i < quantity; i++) {
    userRowData.push(
      `"${user},${target},${right},${ip},${generateRandomData(FROM_TIME, TO_TIME)}"`
    );
  }
  return userRowData.join(',');
};

interface TableItemType {
  privileged_user: string;
  target_user: string;
  right: string;
  ip: string;
  '@timestamp': string;
}

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

const PAGE_SIZE = 10;

const generateListESQLQuery = (
  sortField: string,
  sortDirection: string,
  currentPage: number,
  esqlSource: string
) => `${esqlSource}
      | SORT ${sortField} ${sortDirection}
      | LIMIT ${1 + currentPage * PAGE_SIZE}`; // Load one extra item for the pagination

const generateVisualizationESQLQuery = (stackByField: string, esqlSource: string) =>
  `${esqlSource}
  | EVAL timestamp=DATE_TRUNC(1 hour, TO_DATETIME(@timestamp))
  | STATS results = COUNT(*) by timestamp, ${stackByField}`;

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

export const stackByOptions: VisualizationStackByOption[] = [
  {
    text: 'Privileged User',
    value: 'privileged_user',
  },
  {
    text: 'Target user',
    value: 'target_user',
  },
  {
    text: 'Granted right',
    value: 'right',
  },
  {
    text: 'Source IP',
    value: 'ip',
  },
];

const PrivilegedUserMonitoringSampleDashboardComponent = () => {
  // const { to, from } = useGlobalTime();
  // const timerange = useMemo(() => ({ from, to }), [from, to]);
  const { data } = useKibana().services;
  // const getGlobalQuerySelector = useMemo(() => inputsSelectors.globalQuerySelector(), []);
  // const globalQuery = useDeepEqualSelector(getGlobalQuerySelector);
  // const { filterQuery } = useGlobalFilterQuery({ extraFilter: buildTimeRangeFilter(from, to) });

  // const PRIVILEGED_USER_LIST_ESQL = ();

  const [selectedStackByOption, setSelectedStackByOption] = useState<VisualizationStackByOption>(
    stackByOptions[0]
  );

  useEffect(() => {
    setSelectedStackByOption(stackByOptions[0]);
  }, []);

  const esqlSource = useMemo(() => generateESQLSource(), []);

  const privilegedVisualizationEsql = useMemo(
    () => generateVisualizationESQLQuery(selectedStackByOption.value, esqlSource),
    [selectedStackByOption, esqlSource]
  );

  const setSelectedChartOptionCallback = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      setSelectedStackByOption(
        stackByOptions.find((co) => co.value === event.target.value) ?? stackByOptions[0]
      );
    },
    []
  );

  const [sortField, setSortField] = useState<keyof TableItemType>('@timestamp');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const [currentPage, setCurrentPage] = useState<number>(1);

  const tableEsqlQuery = useMemo(
    () => generateListESQLQuery(sortField, sortDirection, currentPage, esqlSource),
    [sortField, sortDirection, currentPage, esqlSource]
  );

  const {
    isInitialLoading,
    isLoading,
    isError,
    isRefetching,
    data: result,
  } = useQuery({
    queryKey: [tableEsqlQuery], // filterQuery,
    queryFn: async ({ signal }) => {
      return fetchESQLSimple(tableEsqlQuery, data, signal);
    },
    refetchOnWindowFocus: false,
    keepPreviousData: true,
  });

  const onTableChange = ({ page, sort }: Criteria<TableItemType>) => {
    if (sort) {
      const { field, direction } = sort;
      setSortField(field);
      setSortDirection(direction);
    }
  };
  const items = toRecords(result?.response);

  return (
    <HoverVisibilityContainer
      // show={!isInitialLoading}
      targetClassNames={['TODO']}
    >
      <EuiPanel hasBorder={true} hasShadow={false}>
        <HeaderSection
          // id={DETECTION_RESPONSE_RECENT_CASES_QUERY_ID}
          title={
            <FormattedMessage
              id="xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.sampleDashboard.grantedRights.title"
              defaultMessage="Granted rights"
            />
          }
          titleSize="s"
          // toggleStatus={toggleStatus}
          // toggleQuery={setToggleStatus}
          // subtitle={<LastUpdatedAt updatedAt={updatedAt} isUpdating={isLoading} />}
          showInspectButton={false}
          // tooltip={i18n.CASES_TABLE_SECTION_TOOLTIP}
        >
          <EuiFlexGroup alignItems="center" gutterSize="none">
            <EuiFlexItem grow={false}>
              {stackByOptions.length > 1 && (
                <EuiSelect
                  onChange={setSelectedChartOptionCallback}
                  options={stackByOptions}
                  prepend={'Stack by'}
                  value={selectedStackByOption?.value}
                  // aria-label={'i18n.STACK_BY'}
                />
              )}
            </EuiFlexItem>
          </EuiFlexGroup>
        </HeaderSection>
        <EuiFlexGroup direction="column" data-test-subj="entityAnalyticsSections">
          <VisualizationEmbeddable
            stackByField={selectedStackByOption.value}
            applyGlobalQueriesAndFilters={true}
            esql={privilegedVisualizationEsql}
            data-test-subj="embeddable-matrix-histogram"
            getLensAttributes={getLensAttributes}
            height={260}
            id={'my-id'}
            timerange={TIMERANGE}
          />
        </EuiFlexGroup>
        <EuiSpacer size="l" />

        <EuiFlexGroup direction="column" gutterSize="s">
          <EuiFlexItem>
            {isLoading ? (
              <EuiLoadingSpinner size="m" />
            ) : isError ? (
              <div>{'Error loading data'}</div>
            ) : (
              <EuiBasicTable
                loading={isInitialLoading || isRefetching}
                items={take(currentPage * PAGE_SIZE, items) || []}
                onChange={onTableChange}
                sorting={{
                  sort: {
                    field: sortField,
                    direction: sortDirection,
                  },
                }}
                columns={[
                  {
                    field: 'privileged_user',
                    name: 'Privileged user',
                    sortable: true,
                  },
                  {
                    field: 'target_user',
                    name: 'Target user',
                    sortable: true,
                  },
                  {
                    field: 'right',
                    name: 'Granted right',
                    sortable: true,
                  },
                  {
                    field: 'ip',
                    name: 'Source IP',
                    sortable: true,
                  },
                  {
                    field: '@timestamp',
                    name: 'Timestamp',
                    dataType: 'date',
                    sortable: true,
                    render: (timestamp: string) => {
                      return new Date(timestamp).toLocaleString();
                    },
                  },
                ]}
              />
            )}
            <EuiSpacer size="s" />
          </EuiFlexItem>

          {items.length > currentPage * PAGE_SIZE && (
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                isLoading={isInitialLoading || isRefetching}
                onClick={() => {
                  setCurrentPage((page) => page + 1);
                }}
                flush="right"
                color={'primary'}
                size="s"
                // fullWidth={false}
              >
                <FormattedMessage
                  id="xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.sampleDashboard.loadMore"
                  defaultMessage="Load more"
                />
              </EuiButtonEmpty>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </EuiPanel>
    </HoverVisibilityContainer>
  );
};

export const PrivilegedUserMonitoringSampleDashboard = React.memo(
  PrivilegedUserMonitoringSampleDashboardComponent
);

// TODO HANDLE GRACEFULLY ESQL ERROR
