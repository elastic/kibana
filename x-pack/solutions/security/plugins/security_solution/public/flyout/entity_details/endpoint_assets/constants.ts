/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EndpointAssetsPanelExpandableFlyoutProps } from './types';

/**
 * Panel key for the main Endpoint Assets panel
 */
export const EndpointAssetsPanelKey: EndpointAssetsPanelExpandableFlyoutProps['key'] =
  'endpoint-assets-panel';

/**
 * Panel key for the preview mode
 */
export const EndpointAssetsPreviewPanelKey: EndpointAssetsPanelExpandableFlyoutProps['key'] =
  'endpoint-assets-preview-panel';

/**
 * Query key for data fetching
 */
export const ENDPOINT_ASSETS_QUERY_KEY = 'endpoint-assets-flyout-data';

/**
 * Entity Store index pattern for host entities
 */
export const ENTITY_STORE_HOST_INDEX = '.entities.v1.latest.security_host_*';

/**
 * Test IDs for the Endpoint Assets panel components
 */
export const TEST_IDS = {
  PANEL: 'endpoint-assets-panel',
  HEADER: 'endpoint-assets-header',
  CONTENT: 'endpoint-assets-content',
  LOADING: 'endpoint-assets-loading',
  ERROR: 'endpoint-assets-error',
  TABS: 'endpoint-assets-tabs',
  TAB_OVERVIEW: 'endpoint-assets-tab-overview',
  TAB_POSTURE: 'endpoint-assets-tab-posture',
  TAB_DRIFT: 'endpoint-assets-tab-drift',
  TAB_PRIVILEGES: 'endpoint-assets-tab-privileges',
  TAB_SOFTWARE: 'endpoint-assets-tab-software',
  OVERVIEW_SECTION: 'endpoint-assets-overview-section',
  POSTURE_SCORE: 'endpoint-assets-posture-score',
  DRIFT_SUMMARY: 'endpoint-assets-drift-summary',
  PRIVILEGES_SUMMARY: 'endpoint-assets-privileges-summary',
} as const;
