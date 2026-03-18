/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const WATCHLIST_NAME_LABEL = i18n.translate(
  'xpack.securitySolution.entityAnalytics.watchlists.flyout.nameLabel',
  { defaultMessage: 'Name' }
);

export const WATCHLIST_DESCRIPTION_LABEL = i18n.translate(
  'xpack.securitySolution.entityAnalytics.watchlists.flyout.descriptionLabel',
  { defaultMessage: 'Description' }
);

export const WATCHLIST_RISK_SCORE_WEIGHTING_LABEL = i18n.translate(
  'xpack.securitySolution.entityAnalytics.watchlists.flyout.riskScoreWeightingLabel',
  { defaultMessage: 'Risk Score Weighting' }
);

export const WATCHLIST_FILE_UPLOAD_LABEL = i18n.translate(
  'xpack.securitySolution.entityAnalytics.watchlists.flyout.fileUploadLabel',
  { defaultMessage: 'File upload' }
);

export const WATCHLIST_FILE_PICKER_ARIA_LABEL = i18n.translate(
  'xpack.securitySolution.entityAnalytics.watchlists.flyout.filePicker.AriaLabel',
  { defaultMessage: 'Watchlist file picker' }
);

export const WATCHLIST_FILTER_QUERY_LABEL = i18n.translate(
  'xpack.securitySolution.entityAnalytics.watchlists.flyout.filterQueryLabel',
  { defaultMessage: 'Watchlist filter' }
);

export const WATCHLIST_FILTER_QUERY_HELP_TEXT = i18n.translate(
  'xpack.securitySolution.entityAnalytics.watchlists.flyout.filterQueryHelpText',
  { defaultMessage: 'Build a query to filter matching events for this watchlist (POC).' }
);

export const WATCHLIST_IDENTIFY_ENTITIES_BY_LABEL = i18n.translate(
  'xpack.securitySolution.entityAnalytics.watchlists.flyout.identifyEntitiesByLabel',
  { defaultMessage: 'Identify entities by' }
);

export const WATCHLIST_ENTITY_FIELD_PLACEHOLDER = i18n.translate(
  'xpack.securitySolution.entityAnalytics.watchlists.flyout.entityFieldPlaceholder',
  { defaultMessage: 'Select a field' }
);

export const WATCHLIST_ENTITY_FIELD_ARIA_LABEL = i18n.translate(
  'xpack.securitySolution.entityAnalytics.watchlists.flyout.entityFieldAriaLabel',
  { defaultMessage: 'Watchlist entity field selector' }
);
