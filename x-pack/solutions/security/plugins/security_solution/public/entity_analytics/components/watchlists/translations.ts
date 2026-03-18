/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const WATCHLIST_ICON_PIN_ARIA_LABEL = i18n.translate(
  'xpack.securitySolution.entityAnalytics.watchlistFilter.iconPinAriaLabel',
  { defaultMessage: 'Pin' }
);

export const WATCHLIST_ICON_GEAR_ARIA_LABEL = i18n.translate(
  'xpack.securitySolution.entityAnalytics.watchlistFilter.iconGearAriaLabel',
  { defaultMessage: 'Gear' }
);

export const WATCHLIST_GROUP_PREBUILT_LABEL = i18n.translate(
  'xpack.securitySolution.entityAnalytics.watchlistFilter.prebuiltGroupLabel',
  { defaultMessage: 'Prebuilt' }
);

export const WATCHLIST_GROUP_CUSTOM_LABEL = i18n.translate(
  'xpack.securitySolution.entityAnalytics.watchlistFilter.customGroupLabel',
  { defaultMessage: 'Custom' }
);

export const WATCHLIST_PREBUILT_PRIVILEGED_USERS_LABEL = i18n.translate(
  'xpack.securitySolution.entityAnalytics.watchlistFilter.prebuiltPrivilegedUsersLabel',
  { defaultMessage: 'Privileged users' }
);

export const WATCHLIST_PREBUILT_UNAUTHORIZED_LLM_ACCESS_LABEL = i18n.translate(
  'xpack.securitySolution.entityAnalytics.watchlistFilter.prebuiltUnauthorizedLlmAccessLabel',
  { defaultMessage: 'Unauthorized LLM access' }
);

export const WATCHLIST_PREBUILT_DEPARTING_EMPLOYEES_LABEL = i18n.translate(
  'xpack.securitySolution.entityAnalytics.watchlistFilter.prebuiltDepartingEmployeesLabel',
  { defaultMessage: 'Departing employees' }
);

export const WATCHLIST_CUSTOM_C_LEVEL_USERS_LABEL = i18n.translate(
  'xpack.securitySolution.entityAnalytics.watchlistFilter.customCLevelUsersLabel',
  { defaultMessage: 'C-level users' }
);

export const WATCHLIST_CUSTOM_HIGH_RISK_USERS_LABEL = i18n.translate(
  'xpack.securitySolution.entityAnalytics.watchlistFilter.customHighRiskUsersLabel',
  { defaultMessage: 'High-risk users' }
);

export const WATCHLIST_CUSTOM_WATCHLIST_3_LABEL = i18n.translate(
  'xpack.securitySolution.entityAnalytics.watchlistFilter.customWatchlist3Label',
  { defaultMessage: 'Custom watchlist #3' }
);

export const WATCHLIST_FILTER_LABEL = i18n.translate(
  'xpack.securitySolution.entityAnalytics.watchlistFilter.label',
  { defaultMessage: 'Watchlist' }
);

export const WATCHLIST_FILTER_PLACEHOLDER = i18n.translate(
  'xpack.securitySolution.entityAnalytics.watchlistFilter.placeholder',
  { defaultMessage: 'Select watchlist' }
);
