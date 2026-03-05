/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiBasicTableColumn, EuiThemeComputed } from '@elastic/eui';
import { EuiButtonIcon } from '@elastic/eui';
import { FormattedMessage, FormattedRelative } from '@kbn/i18n-react';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { getRowItemsWithActions } from '../../../../../common/components/tables/helpers';
import { getEmptyTagValue } from '../../../../../common/components/empty_value';
import type { WatchlistTableItemType } from './types';

const COLUMN_WIDTHS = { actions: '5%', watchlist_name: '15%' };

const getWatchlistColumn = (): EuiBasicTableColumn<WatchlistTableItemType> => ({
  field: 'name',
  name: (
    <FormattedMessage
      id="xpack.securitySolution.entityAnalytics.watchlistsManagement.table.column.watchlistName"
      defaultMessage="Watchlist Name"
    />
  ),
  width: COLUMN_WIDTHS.watchlist_name,
  render: (watchlistNames: string | string[]) =>
    watchlistNames !== null
      ? getRowItemsWithActions({
          values: Array.isArray(watchlistNames) ? watchlistNames : [watchlistNames],
          fieldName: 'watchlist.name',
          idPrefix: 'watchlist-management-watchlist-name',
          render: (item) => <span>{item}</span>,
          displayCount: 1,
        })
      : getEmptyTagValue(),
});

const getNumberOfEntitiesColumn = (): EuiBasicTableColumn<WatchlistTableItemType> => ({
  field: 'users.length', // TODO: update this function when data is available https://github.com/elastic/security-team/issues/16103
  name: (
    <FormattedMessage
      id="xpack.securitySolution.entityAnalytics.watchlistsManagement.table.column.numberOfUsers"
      defaultMessage="Number of Entities"
    />
  ),
  render: (value: number | undefined) => (typeof value === 'number' ? value : getEmptyTagValue()),
});

const getRiskScoreWeightingColumn = (): EuiBasicTableColumn<WatchlistTableItemType> => ({
  field: 'riskModifier',
  name: (
    <FormattedMessage
      id="xpack.securitySolution.entityAnalytics.watchlistsManagement.table.column.riskScoreWeighting"
      defaultMessage="Risk Score Weighting"
    />
  ),
  render: (value: number | undefined) => (typeof value === 'number' ? value : getEmptyTagValue()),
});

const getSourceColumn = (): EuiBasicTableColumn<WatchlistTableItemType> => ({
  field: 'source', // TODO: update this function when data is available https://github.com/elastic/security-team/issues/16104
  name: (
    <FormattedMessage
      id="xpack.securitySolution.entityAnalytics.watchlistsManagement.table.column.source"
      defaultMessage="Source"
    />
  ),
  render: (value: string | undefined) => (typeof value === 'string' ? value : getEmptyTagValue()),
});

const getLastUpdatedColumn = (): EuiBasicTableColumn<WatchlistTableItemType> => ({
  field: 'updatedAt',
  name: (
    <FormattedMessage
      id="xpack.securitySolution.entityAnalytics.watchlistsManagement.table.column.lastUpdated"
      defaultMessage="Last Updated"
    />
  ),
  render: (value: string | undefined) =>
    typeof value === 'string' ? <FormattedRelative value={new Date(value)} /> : getEmptyTagValue(),
});

const getActionsColumn = (): EuiBasicTableColumn<WatchlistTableItemType> => ({
  // TODO: add actions with flyout https://github.com/elastic/security-team/issues/16108
  name: (
    <FormattedMessage
      id="xpack.securitySolution.entityAnalytics.watchlistsManagement.table.columns.actions"
      defaultMessage="Actions"
    />
  ),
  render: (record: { name: string }) => {
    return (
      <EuiButtonIcon
        iconType="pencil"
        onClick={() => {}}
        aria-label={i18n.translate(
          'xpack.securitySolution.entityAnalytics.watchlistsManagement.table.columns.expand.ariaLabel',
          {
            defaultMessage: 'Watchlist Action',
          }
        )}
      />
    );
  },
  width: COLUMN_WIDTHS.actions,
});

export const buildWatchlistsManagementTableColumns = (
  euiTheme: EuiThemeComputed
): Array<EuiBasicTableColumn<WatchlistTableItemType>> => [
  getWatchlistColumn(),
  getNumberOfEntitiesColumn(),
  getRiskScoreWeightingColumn(),
  getSourceColumn(),
  getLastUpdatedColumn(),
  getActionsColumn(),
];
