/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiBasicTableColumn, EuiThemeComputed } from '@elastic/eui';
import {
  EuiButtonIcon,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
} from '@elastic/eui';
import { FormattedMessage, FormattedRelative } from '@kbn/i18n-react';
import React, { useCallback, useState } from 'react';
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
  field: 'entityCount',
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

const WatchlistsActionsMenu = ({
  record,
  onDelete,
}: {
  record: WatchlistTableItemType;
  onDelete: (record: WatchlistTableItemType) => void;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const closePopover = useCallback(() => setIsOpen(false), []);
  const togglePopover = useCallback(() => setIsOpen((value) => !value), []);

  const button = (
    <EuiButtonIcon
      iconType="boxesHorizontal"
      aria-label={i18n.translate(
        'xpack.securitySolution.entityAnalytics.watchlistsManagement.table.columns.expand.ariaLabel',
        {
          defaultMessage: 'Watchlist actions',
        }
      )}
      onClick={togglePopover}
    />
  );

  return (
    <EuiPopover
      button={button}
      isOpen={isOpen}
      closePopover={closePopover}
      panelPaddingSize="none"
      anchorPosition="downLeft"
    >
      <EuiContextMenuPanel
        items={[
          <EuiContextMenuItem
            key="delete"
            icon="trash"
            data-test-subj="watchlistsManagementTableActionDelete"
            onClick={() => {
              onDelete(record);
              closePopover();
            }}
          >
            <FormattedMessage
              id="xpack.securitySolution.entityAnalytics.watchlistsManagement.table.actions.delete"
              defaultMessage="Delete"
            />
          </EuiContextMenuItem>,
        ]}
      />
    </EuiPopover>
  );
};

const WatchlistsActionsCell = ({
  record,
  onEdit,
  onDelete,
}: {
  record: WatchlistTableItemType;
  onEdit: (record: WatchlistTableItemType) => void;
  onDelete: (record: WatchlistTableItemType) => void;
}) => (
  <EuiFlexGroup gutterSize="s" justifyContent="flexEnd">
    <EuiFlexItem grow={false}>
      <EuiButtonIcon
        iconType="pencil"
        onClick={() => onEdit(record)}
        aria-label={i18n.translate(
          'xpack.securitySolution.entityAnalytics.watchlistsManagement.table.actions.editButton.ariaLabel',
          {
            defaultMessage: 'Edit watchlist',
          }
        )}
      />
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      <WatchlistsActionsMenu record={record} onDelete={onDelete} />
    </EuiFlexItem>
  </EuiFlexGroup>
);

const getActionsColumn = (
  onEdit: (record: WatchlistTableItemType) => void,
  onDelete: (record: WatchlistTableItemType) => void
): EuiBasicTableColumn<WatchlistTableItemType> => ({
  name: (
    <FormattedMessage
      id="xpack.securitySolution.entityAnalytics.watchlistsManagement.table.columns.actions"
      defaultMessage="Actions"
    />
  ),
  render: (record: WatchlistTableItemType) => (
    <WatchlistsActionsCell record={record} onEdit={onEdit} onDelete={onDelete} />
  ),
  width: COLUMN_WIDTHS.actions,
});

export const buildWatchlistsManagementTableColumns = (
  euiTheme: EuiThemeComputed,
  onEdit: (record: WatchlistTableItemType) => void,
  onDelete: (record: WatchlistTableItemType) => void
): Array<EuiBasicTableColumn<WatchlistTableItemType>> => [
  getWatchlistColumn(),
  getNumberOfEntitiesColumn(),
  getRiskScoreWeightingColumn(),
  getSourceColumn(),
  getLastUpdatedColumn(),
  getActionsColumn(onEdit, onDelete),
];
