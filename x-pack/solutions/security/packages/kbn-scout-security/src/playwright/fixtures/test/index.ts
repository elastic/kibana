/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { securityBrowserAuthFixture } from './browser_auth';
export type { SecurityBrowserAuthFixture } from './browser_auth';

export { extendPageObjects } from './page_objects';
export type { SecurityPageObjects } from './page_objects';

// Entity flyout anomalies test constants
export {
  HOST_FLYOUT_ENTITY_ID,
  HOST_FLYOUT_HOST_NAME,
} from './page_objects/entity_flyout_anomalies_page';

// Entity flyout anomalies API mocks
export {
  MOCK_ANOMALY_OVERVIEW_EMPTY,
  MOCK_ANOMALY_OVERVIEW_FILTERED_BY_CREDENTIAL_ACCESS,
  MOCK_ANOMALY_OVERVIEW_WITH_ANOMALIES,
  MOCK_ANOMALY_OVERVIEW_WITH_ANOMALIES_NO_TACTICS,
  MOCK_ANOMALY_SUMMARY,
  MOCK_ANOMALY_SUMMARY_FILTERED_BY_CREDENTIAL_ACCESS,
  MOCK_ANOMALY_SUMMARY_MULTI_TACTIC,
} from './mocks/anomalies';
