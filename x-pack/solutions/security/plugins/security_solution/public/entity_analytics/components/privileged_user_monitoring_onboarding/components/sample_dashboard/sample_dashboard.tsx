/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import type { Criteria } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  EuiBasicTable,
  EuiButtonEmpty,
  EuiCallOut,
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
import { FormattedMessage } from '@kbn/i18n-react';
import { take } from 'lodash/fp';
import type { IEsError } from '@kbn/search-errors';
import type { ESQLSearchParams, ESQLSearchResponse } from '@kbn/es-types';
import { useErrorToast } from '../../../../../common/hooks/use_error_toast';
import { esqlResponseToRecords } from '../../../../../../common/esql/helper';
import { VisualizationEmbeddable } from '../../../../../common/components/visualization_actions/visualization_embeddable';
import { useKibana } from '../../../../../common/lib/kibana';
import { getLensAttributes } from './get_lens_attributes';
import { HeaderSection } from '../../../../../common/components/header_section';
import { useColumns } from './use_columns';
import type { TableItemType, VisualizationStackByOption } from './types';
import { PAGE_SIZE, stackByOptions } from './constants';
import {
  generateESQLSource,
  generateListESQLQuery,
  generateVisualizationESQLQuery,
  getBucketTimeRange,
} from './esql_data_generation';

const fetchESQLSimple = async (
  esqlQuery: string,
  data: DataPublicPluginStart,
  signal: AbortSignal | undefined
) => {
  return getESQLResults({
    esqlQuery,
    search: data.search.search,
    signal,
  });
};

const PrivilegedUserMonitoringSampleDashboardComponent = () => {
  const { data } = useKibana().services;
  const columns = useColumns();
  const defaultStackByOption = stackByOptions[0];
  const [selectedStackByOption, setSelectedStackByOption] =
    useState<VisualizationStackByOption>(defaultStackByOption);
  const [sortField, setSortField] = useState<keyof TableItemType>('@timestamp');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const esqlSource = useMemo(() => generateESQLSource(), []);
  const bucketTimerange = useMemo(() => getBucketTimeRange(), []);
  const privilegedVisualizationEsql = useMemo(
    () => generateVisualizationESQLQuery(selectedStackByOption.value, esqlSource),
    [selectedStackByOption, esqlSource]
  );
  const tableEsqlQuery = useMemo(
    () => generateListESQLQuery(sortField, sortDirection, currentPage, esqlSource),
    [sortField, sortDirection, currentPage, esqlSource]
  );
  const setSelectedChartOptionCallback = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      setSelectedStackByOption(
        stackByOptions.find((co) => co.value === event.target.value) ?? stackByOptions[0]
      );
    },
    []
  );

  const {
    isInitialLoading,
    isLoading,
    isError,
    isRefetching,
    data: result,
    error,
  } = useQuery<
    {
      response: ESQLSearchResponse;
      params: ESQLSearchParams;
    },
    IEsError
  >([tableEsqlQuery], async ({ signal }) => fetchESQLSimple(tableEsqlQuery, data, signal), {
    refetchOnWindowFocus: false, // no need to refetch because the data is static
    keepPreviousData: true, // prevent flicker when changing page
  });

  const onTableChange = ({ sort }: Criteria<TableItemType>) => {
    if (sort) {
      const { field, direction } = sort;
      setSortField(field);
      setSortDirection(direction);
    }
  };
  const items = esqlResponseToRecords<TableItemType>(result?.response);

  useErrorToast(
    i18n.translate(
      'xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.sampleDashboard.queryError',
      {
        defaultMessage: 'There was an error loading the data',
      }
    ),
    error
  );

  return (
    <EuiPanel hasBorder={true} hasShadow={false}>
      <HeaderSection
        title={
          <FormattedMessage
            id="xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.sampleDashboard.grantedRights.title"
            defaultMessage="Granted rights"
          />
        }
        titleSize="s"
        showInspectButton={false}
      >
        <EuiFlexGroup alignItems="center" gutterSize="none">
          <EuiFlexItem grow={false}>
            {stackByOptions.length > 1 && (
              <EuiSelect
                onChange={setSelectedChartOptionCallback}
                options={stackByOptions}
                prepend={i18n.translate(
                  'xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.sampleDashboard.stackBy.label',
                  {
                    defaultMessage: 'Stack by',
                  }
                )}
                value={selectedStackByOption?.value}
              />
            )}
          </EuiFlexItem>
        </EuiFlexGroup>
      </HeaderSection>
      <EuiFlexGroup direction="column" data-test-subj="entityAnalyticsSections">
        <VisualizationEmbeddable
          stackByField={selectedStackByOption.value}
          esql={privilegedVisualizationEsql}
          data-test-subj="embeddable-matrix-histogram"
          getLensAttributes={getLensAttributes}
          height={260}
          id="PrivilegedUserMonitoring-sample_dashboard"
          timerange={bucketTimerange}
        />
      </EuiFlexGroup>
      <EuiSpacer size="l" />

      <EuiFlexGroup direction="column" gutterSize="s">
        <EuiFlexItem>
          {isLoading ? (
            <EuiLoadingSpinner size="m" />
          ) : isError ? (
            <div>
              <EuiCallOut
                title={
                  <FormattedMessage
                    id="xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.sampleDashboard.errorLoadingData"
                    defaultMessage="Error loading data"
                  />
                }
                color="danger"
                iconType="error"
              />
            </div>
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
              columns={columns}
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
              color="primary"
              size="s"
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
  );
};

export const PrivilegedUserMonitoringSampleDashboard = React.memo(
  PrivilegedUserMonitoringSampleDashboardComponent
);
