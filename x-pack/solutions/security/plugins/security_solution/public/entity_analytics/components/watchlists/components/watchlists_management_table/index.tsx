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
  EuiSpacer,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useWatchlistsTableData } from './hooks/use_watchlists_table_data';
import { buildWatchlistsManagementTableColumns } from './columns';

export const WATCHLISTS_MANAGEMENT_TABLE_ID = 'watchlistsManagementTableId';

export const WatchlistsManagementTable: React.FC<{ spaceId: string }> = ({ spaceId }) => {
  const { euiTheme } = useEuiTheme();
  const columns = buildWatchlistsManagementTableColumns(euiTheme);
  const { visibleRecords, isLoading, hasError } = useWatchlistsTableData(spaceId, 0, true);
  return (
    <EuiFlexGroup direction="column">
      <EuiFlexItem>
        <EuiSpacer size="s" />
        <EuiHorizontalRule margin="none" />
        <EuiSpacer size="m" />
        <EuiBasicTable
          id={WATCHLISTS_MANAGEMENT_TABLE_ID}
          tableCaption={i18n.translate(
            'xpack.securitySolution.entityAnalytics.watchlists.watchlistsManagementTable.tableCaption',
            { defaultMessage: 'Watchlists management table' }
          )}
          loading={isLoading}
          items={visibleRecords || []}
          columns={columns}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
