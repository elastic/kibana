/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import {
  useEuiTheme,
  EuiFlexGroup,
  EuiFlexItem,
  EuiBasicTable,
  EuiHorizontalRule,
  EuiLoadingElastic,
  EuiSpacer,
  EuiCallOut,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { InspectButton, InspectButtonContainer } from '../../../../../common/components/inspect';
import { useGlobalTime } from '../../../../../common/containers/use_global_time';
import { useQueryInspector } from '../../../../../common/components/page/manage_query';
import { useWatchlistsTableData } from './hooks/use_watchlists_table_data';
import { buildWatchlistsManagementTableColumns } from './columns';

export const WATCHLISTS_MANAGEMENT_TABLE_ID = 'watchlistsManagementTableId';
export const WATCHLISTS_MANAGEMENT_TABLE_QUERY_ID = 'watchlistsManagementTableQueryId';

export const WatchlistsManagementTable: React.FC<{ spaceId: string }> = ({ spaceId }) => {
  const { setQuery, deleteQuery } = useGlobalTime();
  const { euiTheme } = useEuiTheme();
  const columns = buildWatchlistsManagementTableColumns(euiTheme);
  const { visibleRecords, isLoading, hasError, refetch, inspect } = useWatchlistsTableData(
    spaceId,
    0,
    true
  );

  useQueryInspector({
    deleteQuery,
    inspect,
    refetch,
    setQuery,
    queryId: WATCHLISTS_MANAGEMENT_TABLE_QUERY_ID,
    loading: isLoading,
  });

  return (
    <InspectButtonContainer>
      <EuiFlexGroup direction="column">
        <EuiFlexItem>
          <EuiSpacer size="s" />
          <EuiHorizontalRule margin="none" />
          <EuiSpacer size="m" />
          {hasError && (
            <EuiCallOut
              announceOnMount
              data-test-subj="watchlistsManagementTableError"
              title={i18n.translate(
                'xpack.securitySolution.entityAnalytics.watchlists.watchlistsManagementTable.error',
                {
                  defaultMessage:
                    'There was an error retrieving watchlists. Results may be incomplete.',
                }
              )}
              color="danger"
              iconType="error"
            />
          )}
          <EuiFlexGroup justifyContent="flexEnd">
            <EuiFlexItem grow={false}>
              <InspectButton queryId={WATCHLISTS_MANAGEMENT_TABLE_QUERY_ID} />
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiFlexGroup direction="column" gutterSize="s">
            <EuiFlexItem>
              {isLoading && visibleRecords.length === 0 ? (
                <EuiFlexGroup
                  justifyContent="center"
                  data-test-subj="watchlistsManagementTableLoading"
                >
                  <EuiFlexItem grow={false}>
                    <EuiLoadingElastic size="l" />
                  </EuiFlexItem>
                </EuiFlexGroup>
              ) : visibleRecords.length > 0 ? (
                <EuiBasicTable
                  id={WATCHLISTS_MANAGEMENT_TABLE_ID}
                  data-test-subj="watchlistsManagementTable"
                  tableCaption={i18n.translate(
                    'xpack.securitySolution.entityAnalytics.watchlists.watchlistsManagementTable.tableCaption',
                    { defaultMessage: 'Watchlists management table' }
                  )}
                  loading={isLoading}
                  items={visibleRecords || []}
                  columns={columns}
                />
              ) : (
                !isLoading && (
                  <EuiText
                    size="s"
                    color="subdued"
                    textAlign="center"
                    data-test-subj="watchlistsManagementTableEmpty"
                  >
                    <FormattedMessage
                      id="xpack.securitySolution.entityAnalytics.watchlists.watchlistsManagementTable.noData"
                      defaultMessage="No watchlists found"
                    />
                  </EuiText>
                )
              )}
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </InspectButtonContainer>
  );
};
