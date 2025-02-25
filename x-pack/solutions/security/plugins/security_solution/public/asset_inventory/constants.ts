/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const MAX_ASSETS_TO_LOAD = 500;
export const DEFAULT_VISIBLE_ROWS_PER_PAGE = 25;
export const ASSET_INVENTORY_INDEX_PATTERN = 'logs-cloud_asset_inventory.asset_inventory-*';

export const GRID_DATA_QUERY_KEY = 'asset_inventory_grid_data';
export const CHART_DATA_QUERY_KEY = 'asset_inventory_chart_data';

export const ASSET_INVENTORY_TABLE_ID = 'asset-inventory-table';

const LOCAL_STORAGE_PREFIX = 'assetInventory';
export const LOCAL_STORAGE_COLUMNS_KEY = `${LOCAL_STORAGE_PREFIX}:columns`;
export const LOCAL_STORAGE_COLUMNS_SETTINGS_KEY = `${LOCAL_STORAGE_COLUMNS_KEY}:settings`;
export const LOCAL_STORAGE_DATA_TABLE_PAGE_SIZE_KEY = `${LOCAL_STORAGE_PREFIX}:dataTable:pageSize`;

export const ASSET_INVENTORY_TEST_SUBJ_GRID = 'asset-inventory-test-subj-grid-wrapper';
export const ASSET_INVENTORY_TEST_SUBJ_PAGE_TITLE = 'all-assets-title'; // 'asset-inventory-test-subj-page-title'
