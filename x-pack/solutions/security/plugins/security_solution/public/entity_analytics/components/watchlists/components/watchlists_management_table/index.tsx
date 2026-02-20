/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { useEuiTheme, EuiPanel, EuiCallOut, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useWatchlistsTableData } from './hooks/use_watchlists_table_data';
import { InspectButtonContainer } from '../../../../../common/components/inspect';

export const WatchlistsManagementTable: React.FC<{ spaceId: string }> = ({ spaceId }) => {
  const { euiTheme } = useEuiTheme();
  const { visibleRecords, isLoading, hasError, refetch, inspect, hasNextPage } =
    useWatchlistsTableData(spaceId, 0, true);
  return (
    <InspectButtonContainer>
      <EuiPanel hasBorder hasShadow={false} data-test-subj="watchlist-management-table-panel">
        {hasError && (
          <EuiCallOut
            announceOnMount
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
        <EuiFlexGroup direction="column" gutterSize="s">
          <EuiFlexItem />
        </EuiFlexGroup>
      </EuiPanel>
    </InspectButtonContainer>
  );
};
