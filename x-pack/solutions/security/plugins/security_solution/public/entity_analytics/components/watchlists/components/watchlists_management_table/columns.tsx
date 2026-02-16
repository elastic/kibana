/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Columns Required:
 * Watchlist: String
 * Number of Users: number
 * Risk Score Weighting: number
 * Source: String (Integration | Index | CSV ) enum / similar
 * CreatedBy: String
 * Last updated: DateTime?
 * Actions: render?
 */

import type { EuiBasicTableColumn, EuiThemeComputed } from '@elastic/eui';
import type { WatchlistTableItemType } from './types';

const getWatchlistColumn = (): EuiBasicTableColumn<WatchlistTableItemType> =>
  ({} as EuiBasicTableColumn<WatchlistTableItemType>);

const getNumberOfUsersColumn = (): EuiBasicTableColumn<WatchlistTableItemType> =>
  ({} as EuiBasicTableColumn<WatchlistTableItemType>);

const getRiskScoreWeightingColumn = (): EuiBasicTableColumn<WatchlistTableItemType> =>
  ({} as EuiBasicTableColumn<WatchlistTableItemType>);

const getSourceColumn = (): EuiBasicTableColumn<WatchlistTableItemType> =>
  ({} as EuiBasicTableColumn<WatchlistTableItemType>);

const getCreatedByColumn = (): EuiBasicTableColumn<WatchlistTableItemType> =>
  ({} as EuiBasicTableColumn<WatchlistTableItemType>);

const getLastUpdatedColumn = (): EuiBasicTableColumn<WatchlistTableItemType> =>
  ({} as EuiBasicTableColumn<WatchlistTableItemType>);

const getActionsColumn = (): EuiBasicTableColumn<WatchlistTableItemType> =>
  ({} as EuiBasicTableColumn<WatchlistTableItemType>);

export const buildPrivilegedUsersTableColumns = (
  euiTheme: EuiThemeComputed
): Array<EuiBasicTableColumn<WatchlistTableItemType>> => [
  getWatchlistColumn(),
  getNumberOfUsersColumn(),
  getRiskScoreWeightingColumn(),
  getSourceColumn(),
  getCreatedByColumn(),
  getLastUpdatedColumn(),
  getActionsColumn(),
];
