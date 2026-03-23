/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const FINDINGS_VULNERABILITY_FLYOUT_DESCRIPTION_LIST =
  'vulnerability-flyout-description-list';
export const JSON_TAB_VULNERABILITY_FLYOUT = 'vulnerability_json_tab_flyout';
export const OVERVIEW_TAB_VULNERABILITY_FLYOUT = 'vulnerability_overview_tab_flyout';
export const DATA_SOURCE_VULNERABILITY_FLYOUT = 'vulnerability_flyout_data_source_display_box';
export const VULNERABILITY_SCORES_FLYOUT = 'vulnerability_flyout_score';
export const TAB_ID_VULNERABILITY_FLYOUT = (tabId: string) =>
  `vulnerability-finding-flyout-tab-${tabId}`;

export const LATEST_VULNERABILITIES_TABLE = 'latest_vulnerabilities_table';

export const VULNERABILITIES_GROUPING_COUNTER = 'vulnerabilities_grouping_counter';

export const VULNERABILITIES_PAGE = 'cloud-sec-vulnerabilities-page';
export const VULNERABILITY_HEADER_REFERENCE_LINK = 'vulnerability-header-reference-link';
export const VULNERABILITY_HEADER_TITLE = 'vulnerability-header-reference-title';
export const VULNERABILITY_HEADER_ID = 'vulnerability-header-reference-id';
export const VULNERABILITY_HEADER_CVE_BADGE = 'vulnerability-header-cve-badge';
export const getVulnerabilityLinkTestId = (id: string) => `vulnerability-reference-link-${id}`;
export const getVulnerabilityIdTestId = (id: string) => `vulnerability-id-${id}`;
export const VULNERABILITY_OVERVIEW_TAB_ID = 'vulnerability-overview-tab-id';
export const VULNERABILITY_OVERVIEW_TAB_ID_MORE_BTN = 'vulnerability-overview-tab-id-more-btn';
export const VULNERABILITY_OVERVIEW_TAB_ID_LESS_BTN = 'vulnerability-overview-tab-id-more-less';
export const VULNERABILITY_OVERVIEW_PUBLISHED_DATE = 'vulnerability-overview-tab-published-date';
export const VULNERABILITY_EMPTY_VALUE = 'vulnerability-empty-value';
export const VULNERABILITY_RESOURCE_TABLE = 'vulnerability-resource-table';
