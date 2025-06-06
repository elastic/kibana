/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import React, { useMemo, useState } from 'react';
import type { Criteria, EuiBasicTableColumn } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  EuiBasicTable,
  EuiButtonEmpty,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiSpacer,
  useEuiTheme,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { take } from 'lodash/fp';
import { css } from '@emotion/react';
import { InspectButton, InspectButtonContainer } from '../../../../../common/components/inspect';
import type { GetLensAttributes } from '../../../../../common/components/visualization_actions/types';
import { useErrorToast } from '../../../../../common/hooks/use_error_toast';
import { VisualizationEmbeddable } from '../../../../../common/components/visualization_actions/visualization_embeddable';
import { DASHBOARD_TABLE_QUERY_ID, useDashboardTableQuery } from './hooks';

export const DEFAULT_PAGE_SIZE = 10;

export interface VisualizationStackByOption {
  text: string;
  value: string;
}

export const EsqlDashboardPanel = <TableItemType extends Record<string, string>>({
  stackByField,
  generateVisualizationQuery,
  generateTableQuery,
  getLensAttributes,
  columns,
  timerange,
  pageSize = DEFAULT_PAGE_SIZE,
  showInspectTable = false,
  title,
}: {
  title: ReactNode;
  stackByField: string;
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
  showInspectTable?: boolean;
}) => {
  const [sortField, setSortField] = useState<keyof TableItemType>('@timestamp');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const { euiTheme } = useEuiTheme();

  const tableQuery = useMemo(
    () => generateTableQuery(sortField, sortDirection, currentPage),
    [sortField, sortDirection, currentPage, generateTableQuery]
  );

  const visualizationQuery = useMemo(
    () => generateVisualizationQuery(stackByField),
    [generateVisualizationQuery, stackByField]
  );

  const {
    records: items,
    error,
    isLoading,
    isInitialLoading,
    isRefetching,
    isError,
  } = useDashboardTableQuery<TableItemType>(tableQuery);

  const onTableChange = ({ sort }: Criteria<TableItemType>) => {
    if (sort) {
      const { field, direction } = sort;
      setSortField(field);
      setSortDirection(direction);
    }
  };

  useErrorToast(
    i18n.translate('xpack.securitySolution.genericDashboard.queryError', {
      defaultMessage: 'There was an error loading the data',
    }),
    error
  );

  return (
    <>
      <EuiFlexGroup direction="column" data-test-subj="genericDashboardSections">
        <VisualizationEmbeddable
          stackByField={stackByField}
          esql={visualizationQuery}
          data-test-subj="genericDashboardEmbeddableHistogram"
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
            <InspectButtonContainer>
              <div
                // Anchors the position absolute inspect button (nearest positioned ancestor)
                css={css`
                  position: relative;
                `}
              >
                <div
                  // Position the inspect button above the table
                  css={css`
                    position: absolute;
                    right: 0;
                    top: -${euiTheme.size.base};
                  `}
                >
                  {showInspectTable && (
                    <InspectButton queryId={DASHBOARD_TABLE_QUERY_ID} title={title} />
                  )}
                </div>
                <EuiBasicTable
                  id={DASHBOARD_TABLE_QUERY_ID}
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
              </div>
            </InspectButtonContainer>
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
              iconType="sortDown"
              iconSide="right"
              iconSize="s"
            >
              <FormattedMessage
                id="xpack.securitySolution.genericDashboard.showMore"
                defaultMessage="Show more"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </>
  );
};
