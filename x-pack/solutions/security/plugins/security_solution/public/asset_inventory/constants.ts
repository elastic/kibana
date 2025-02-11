/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const MAX_ASSETS_TO_LOAD = 500; // equivalent to MAX_FINDINGS_TO_LOAD in @kbn/cloud-security-posture-common
export const ASSET_INVENTORY_INDEX_PATTERN = 'logs-cloud_asset_inventory.asset_inventory-*';
export const LOCAL_STORAGE_DATA_TABLE_DEFAULT_COLUMN_IDS = 'assetInventory:dataTable:columns';
export const LOCAL_STORAGE_DATA_TABLE_DEFAULT_COLUMN_SETTINGS = `${LOCAL_STORAGE_DATA_TABLE_DEFAULT_COLUMN_IDS}:settings`;
export const LOCAL_STORAGE_DATA_TABLE_PAGE_SIZE_KEY = 'assetInventory:dataTable:pageSize';
