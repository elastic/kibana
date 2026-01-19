/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const LOADING_PRIMARIES = i18n.translate(
  'xpack.securitySolution.entityAnalytics.entityStore.groupedTable.loadingPrimaries',
  {
    defaultMessage: 'Loading entities...',
  }
);

export const LOADING_SECONDARIES = i18n.translate(
  'xpack.securitySolution.entityAnalytics.entityStore.groupedTable.loadingSecondaries',
  {
    defaultMessage: 'Loading resolved entities...',
  }
);

export const ERROR_LOADING_PRIMARIES = i18n.translate(
  'xpack.securitySolution.entityAnalytics.entityStore.groupedTable.errorLoadingPrimaries',
  {
    defaultMessage: 'Error loading entities',
  }
);

export const ERROR_LOADING_SECONDARIES = i18n.translate(
  'xpack.securitySolution.entityAnalytics.entityStore.groupedTable.errorLoadingSecondaries',
  {
    defaultMessage: 'Error loading resolved entities',
  }
);

export const NO_PRIMARIES_FOUND = i18n.translate(
  'xpack.securitySolution.entityAnalytics.entityStore.groupedTable.noPrimariesFound',
  {
    defaultMessage: 'No entities found',
  }
);

export const NO_SECONDARIES_FOUND = i18n.translate(
  'xpack.securitySolution.entityAnalytics.entityStore.groupedTable.noSecondariesFound',
  {
    defaultMessage: 'No resolved entities found',
  }
);

export const COLUMN_NAME = i18n.translate(
  'xpack.securitySolution.entityAnalytics.entityStore.groupedTable.columnName',
  {
    defaultMessage: 'Name',
  }
);

export const COLUMN_SOURCE = i18n.translate(
  'xpack.securitySolution.entityAnalytics.entityStore.groupedTable.columnSource',
  {
    defaultMessage: 'Source',
  }
);

export const COLUMN_RISK_SCORE = i18n.translate(
  'xpack.securitySolution.entityAnalytics.entityStore.groupedTable.columnRiskScore',
  {
    defaultMessage: 'Risk Score',
  }
);

export const COLUMN_RISK_LEVEL = i18n.translate(
  'xpack.securitySolution.entityAnalytics.entityStore.groupedTable.columnRiskLevel',
  {
    defaultMessage: 'Risk Level',
  }
);

export const COLUMN_RESOLVED = i18n.translate(
  'xpack.securitySolution.entityAnalytics.entityStore.groupedTable.columnResolved',
  {
    defaultMessage: 'Resolved',
  }
);

export const COLUMN_LAST_UPDATE = i18n.translate(
  'xpack.securitySolution.entityAnalytics.entityStore.groupedTable.columnLastUpdate',
  {
    defaultMessage: 'Last Update',
  }
);

export const EXPAND_ROW = i18n.translate(
  'xpack.securitySolution.entityAnalytics.entityStore.groupedTable.expandRow',
  {
    defaultMessage: 'Expand row',
  }
);

export const COLLAPSE_ROW = i18n.translate(
  'xpack.securitySolution.entityAnalytics.entityStore.groupedTable.collapseRow',
  {
    defaultMessage: 'Collapse row',
  }
);

export const GROUPED_VIEW_TOGGLE = i18n.translate(
  'xpack.securitySolution.entityAnalytics.entityStore.groupedTable.groupedViewToggle',
  {
    defaultMessage: 'Grouped view',
  }
);
