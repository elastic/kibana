/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { INTEGRATION_CARD_HEIGHT } from '../common/lib/integrations/constants';
import type { Tab } from '../common/lib/integrations/types';
import { IntegrationTabId } from '../common/lib/integrations/types';

export const MAX_ASSETS_TO_LOAD = 500;
export const DEFAULT_VISIBLE_ROWS_PER_PAGE = 25;
export const ASSET_INVENTORY_INDEX_PATTERN = 'entities-generic-latest';
export const ASSET_INVENTORY_DATA_VIEW_ID_PREFIX = 'asset-inventory';

export const QUERY_KEY_GRID_DATA = 'asset_inventory_grid_data';
export const QUERY_KEY_CHART_DATA = 'asset_inventory_chart_data';
export const QUERY_KEY_GROUPING_DATA = 'asset-inventory-grouping-data';

export const ASSET_INVENTORY_TABLE_ID = 'asset-inventory-table';

const LOCAL_STORAGE_PREFIX = 'assetInventory';
export const LOCAL_STORAGE_COLUMNS_KEY = `${LOCAL_STORAGE_PREFIX}:columns`;
export const LOCAL_STORAGE_COLUMNS_SETTINGS_KEY = `${LOCAL_STORAGE_COLUMNS_KEY}:settings`;
export const LOCAL_STORAGE_DATA_TABLE_PAGE_SIZE_KEY = `${LOCAL_STORAGE_PREFIX}:dataTable:pageSize`;
export const LOCAL_STORAGE_DATA_TABLE_COLUMNS_KEY = `${LOCAL_STORAGE_PREFIX}:dataTable:columns`;
export const LOCAL_STORAGE_ONBOARDING_SUCCESS_CALLOUT_KEY = `${LOCAL_STORAGE_PREFIX}:onboarding:successCallout`;
export const LOCAL_STORAGE_ASSETS_GROUPING_KEY = `${LOCAL_STORAGE_PREFIX}:grouping`;

export const TEST_SUBJ_DATA_GRID = 'asset-inventory-test-subj-grid-wrapper';
export const TEST_SUBJ_PAGE_TITLE = 'asset-inventory-test-subj-page-title';
export const TEST_SUBJ_EMPTY_STATE = 'asset-inventory-empty-state';
export const TEST_SUBJ_LOADING = 'asset-inventory-loading';
export const TEST_SUBJ_ONBOARDING_GET_STARTED = 'asset-inventory-onboarding-get-started';
export const TEST_SUBJ_ONBOARDING_INITIALIZING = 'asset-inventory-onboarding-initializing';
export const TEST_SUBJ_ONBOARDING_NO_DATA_FOUND = 'asset-inventory-onboarding-no-data-found';
export const TEST_SUBJ_ONBOARDING_SUCCESS_CALLOUT = 'asset-inventory-onboarding-success-callout';
export const TEST_SUBJ_ONBOARDING_PERMISSION_DENIED =
  'asset-inventory-onboarding-permission-denied';
export const TEST_SUBJ_GROUPING = 'asset-inventory-grouping';
export const TEST_SUBJ_GROUPING_LOADING = 'asset-inventory-grouping-loading';
export const TEST_SUBJ_GROUPING_COUNTER = 'asset-inventory-grouping-counter';

export const DOCS_URL = 'https://ela.st/cloud-asset-discovery';

export const assetIntegrationDocsNavigation = {
  overviewPath: `${DOCS_URL}`,
  getStartedPath: `${DOCS_URL}-get-started`,
  awsGetStartedPath: `${DOCS_URL}-get-started`,
  gcpGetStartedPath: `${DOCS_URL}-get-started-gcp.html`,
  azureGetStartedPath: `${DOCS_URL}-get-started-azure.html`,
};

export const DEFAULT_TABLE_SECTION_HEIGHT = 512; // px

export const ASSET_FIELDS = {
  ASSET_CRITICALITY: 'asset.criticality',
  CLOUD_ACCOUNT_ID: 'cloud.account.id',
  CLOUD_ACCOUNT_NAME: 'cloud.account.name',
  CLOUD_PROVIDER: 'cloud.provider',
  ENTITY_ID: 'entity.id',
  ENTITY_NAME: 'entity.name',
  ENTITY_RISK: 'entity.risk',
  ENTITY_SUB_TYPE: 'entity.sub_type',
  ENTITY_TYPE: 'entity.type',
  TIMESTAMP: '@timestamp',
} as const;

export const ASSET_GROUPING_OPTIONS = {
  NONE: 'none',
  ASSET_CRITICALITY: ASSET_FIELDS.ASSET_CRITICALITY,
  ENTITY_TYPE: ASSET_FIELDS.ENTITY_TYPE,
  CLOUD_ACCOUNT: ASSET_FIELDS.CLOUD_ACCOUNT_ID,
};

export const ASSET_INVENTORY_ONBOARDING_INTEGRATIONS_TAB: Tab[] = [
  {
    category: '',
    iconType: 'starFilled',
    id: IntegrationTabId.recommended,
    label: 'Recommended',
    overflow: 'hidden',
    showSearchTools: false,
    // Fleet has a default sorting for integrations by category that Security Solution does not want to apply
    // so we need to disable the sorting for the recommended tab to allow static ordering according to the featuredCardIds
    sortByFeaturedIntegrations: false,
    featuredCardIds: [
      'epr:crowdstrike',
      'epr:cloud_asset_inventory',
      'epr:jamf_pro',
      'epr:entityanalytics_okta',
      'epr:entityanalytics_entra_id',
      'epr:servicenow',
      'epr:entityanalytics_ad',
      'epr:cloud_security_posture',
      'epr:sentinel_one',
    ],
    height: `${INTEGRATION_CARD_HEIGHT * 3.5}px`,
  },
];
