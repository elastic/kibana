/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import type { Criteria, EuiBasicTableColumn } from '@elastic/eui';
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
import { FormattedMessage } from '@kbn/i18n-react';
import { take } from 'lodash/fp';
import { getESQLResults } from '@kbn/esql-utils';
import { esqlResponseToRecords } from '../../../../common/utils/esql';
import type { GetLensAttributes } from '../../../../common/components/visualization_actions/types';
import { useErrorToast } from '../../../../common/hooks/use_error_toast';
import { VisualizationEmbeddable } from '../../../../common/components/visualization_actions/visualization_embeddable';
import { useKibana } from '../../../../common/lib/kibana';
import { HeaderSection } from '../../../../common/components/header_section';

export const DEFAULT_PAGE_SIZE = 10;

export interface VisualizationStackByOption {
  text: string;
  value: string;
}

export const EsqlDashboardPanel = <TableItemType extends Record<string, string>>({
  title,
  stackByOptions,
  generateVisualizationQuery,
  generateTableQuery,
  getLensAttributes,
  columns,
  timerange,
  pageSize = DEFAULT_PAGE_SIZE,
}: {
  title: string | React.ReactNode;
  stackByOptions: VisualizationStackByOption[];
  generateVisualizationQuery: (stackByValue: string) => string;
  generateTableQuery: (
    sortField: keyof TableItemType,
    sortDirection: 'asc' | 'desc',
    currentPage: number
  ) => string;
  columns: Array<EuiBasicTableColumn<TableItemType>>;
  getLensAttributes: GetLensAttributes;
  timerange: { from: string; to: string };
  pageSize?: number;
}) => {
  const { data } = useKibana().services;
  const defaultStackByOption = stackByOptions[0];
  const [selectedStackByOption, setSelectedStackByOption] =
    useState<VisualizationStackByOption>(defaultStackByOption);
  const [sortField, setSortField] = useState<keyof TableItemType>('@timestamp');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState<number>(1);

  const visualizationQuery = useMemo(
    () => generateVisualizationQuery(selectedStackByOption.value),
    [selectedStackByOption, generateVisualizationQuery]
  );

  const tableQuery = useMemo(
    () => generateTableQuery(sortField, sortDirection, currentPage),
    [sortField, sortDirection, currentPage, generateTableQuery]
  );

  const setSelectedChartOptionCallback = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      setSelectedStackByOption(
        stackByOptions.find((co) => co.value === event.target.value) ?? stackByOptions[0]
      );
    },
    [stackByOptions]
  );

  const {
    isInitialLoading,
    isLoading,
    isError,
    isRefetching,
    data: result,
    error,
  } = useQuery(
    [tableQuery],
    async ({ signal }) =>
      getESQLResults({
        esqlQuery: tableQuery,
        search: data.search.search,
        signal,
      }),
    {
      refetchOnWindowFocus: false,
      keepPreviousData: true,
    }
  );

  const onTableChange = ({ sort }: Criteria<TableItemType>) => {
    if (sort) {
      const { field, direction } = sort;
      setSortField(field);
      setSortDirection(direction);
    }
  };

  const items = esqlResponseToRecords<TableItemType>(result?.response);

  useErrorToast(
    i18n.translate('xpack.securitySolution.genericDashboard.queryError', {
      defaultMessage: 'There was an error loading the data',
    }),
    error
  );

  return (
    <EuiPanel hasBorder={true} hasShadow={false}>
      <HeaderSection title={title} titleSize="s" showInspectButton={false}>
        <EuiFlexGroup alignItems="center" gutterSize="none">
          <EuiFlexItem grow={false}>
            {stackByOptions.length > 1 && (
              <EuiSelect
                onChange={setSelectedChartOptionCallback}
                options={stackByOptions}
                prepend={i18n.translate('xpack.securitySolution.genericDashboard.stackBy.label', {
                  defaultMessage: 'Stack by',
                })}
                value={selectedStackByOption?.value}
              />
            )}
          </EuiFlexItem>
        </EuiFlexGroup>
      </HeaderSection>
      <EuiFlexGroup direction="column" data-test-subj="genericDashboardSections">
        <VisualizationEmbeddable
          stackByField={selectedStackByOption.value}
          esql={visualizationQuery}
          data-test-subj="embeddable-matrix-histogram"
          getLensAttributes={getLensAttributes}
          height={260}
          id="GenericDashboard"
          timerange={timerange}
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
                title={i18n.translate('xpack.securitySolution.genericDashboard.errorLoadingData', {
                  defaultMessage: 'Error loading data',
                })}
                color="danger"
                iconType="error"
              />
            </div>
          ) : (
            <EuiBasicTable
              loading={isInitialLoading || isRefetching}
              items={take(currentPage * pageSize, items) || []}
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

        {items.length > currentPage * pageSize && (
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
                id="xpack.securitySolution.genericDashboard.loadMore"
                defaultMessage="Load more"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </EuiPanel>
  );
};
