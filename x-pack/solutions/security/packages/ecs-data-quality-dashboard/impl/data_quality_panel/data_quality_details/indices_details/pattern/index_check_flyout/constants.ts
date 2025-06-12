/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const DEFAULT_HISTORICAL_RESULTS_START_DATE = 'now-30d';
export const DEFAULT_HISTORICAL_RESULTS_END_DATE = 'now';

export const ALL_TAB_ID = 'allTab' as const;
export const ECS_COMPLIANT_TAB_ID = 'ecsCompliantTab' as const;
export const CUSTOM_TAB_ID = 'customTab' as const;
export const INCOMPATIBLE_TAB_ID = 'incompatibleTab' as const;
export const SAME_FAMILY_TAB_ID = 'sameFamilyTab' as const;
