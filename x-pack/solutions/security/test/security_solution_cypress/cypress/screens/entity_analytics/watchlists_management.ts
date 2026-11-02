/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getDataTestSubjectSelector } from '../../helpers/common';

export const WATCHLISTS_MANAGEMENT_PAGE_TITLE =
  getDataTestSubjectSelector('watchlistManagementPage');
export const WATCHLISTS_MANAGEMENT_TABLE = getDataTestSubjectSelector('watchlistsManagementTable');
export const WATCHLISTS_MANAGEMENT_TABLE_LOADING = getDataTestSubjectSelector(
  'watchlistsManagementTableLoading'
);
export const WATCHLISTS_MANAGEMENT_TABLE_EMPTY = getDataTestSubjectSelector(
  'watchlistsManagementTableEmpty'
);
export const WATCHLISTS_MANAGEMENT_TABLE_ERROR = getDataTestSubjectSelector(
  'watchlistsManagementTableError'
);
