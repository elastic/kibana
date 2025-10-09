/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FieldMap } from '@kbn/alerts-as-data-utils';
import { ALERT_STATE_NAMESPACE } from '@kbn/rule-data-utils';

export const ALERT_STATE_META = `${ALERT_STATE_NAMESPACE}.meta` as const;
export const ALERT_STATE_FIRST_CHECKED_AT = `${ALERT_STATE_NAMESPACE}.first_checked_at` as const;
export const ALERT_STATE_FIRST_TRIGGERED_AT =
  `${ALERT_STATE_NAMESPACE}.first_triggered_at` as const;
export const ALERT_STATE_LAST_CHECKED_AT = `${ALERT_STATE_NAMESPACE}.last_checked_at` as const;
export const ALERT_STATE_LAST_TRIGGERED_AT = `${ALERT_STATE_NAMESPACE}.last_triggered_at` as const;
export const ALERT_STATE_LAST_RESOLVED_AT = `${ALERT_STATE_NAMESPACE}.last_resolved_at` as const;
export const ALERT_STATE_IS_TRIGGERED = `${ALERT_STATE_NAMESPACE}.is_triggered` as const;

export const uptimeRuleStateFieldMap: FieldMap = {
  [ALERT_STATE_META]: {
    type: 'object',
    required: false,
  },
  [ALERT_STATE_FIRST_CHECKED_AT]: {
    type: 'date',
    required: false,
  },
  [ALERT_STATE_FIRST_TRIGGERED_AT]: {
    type: 'date',
    required: false,
  },
  [ALERT_STATE_LAST_CHECKED_AT]: {
    type: 'date',
    required: false,
  },
  [ALERT_STATE_LAST_TRIGGERED_AT]: {
    type: 'date',
    required: false,
  },
  [ALERT_STATE_LAST_RESOLVED_AT]: {
    type: 'date',
    required: false,
  },
  [ALERT_STATE_IS_TRIGGERED]: {
    type: 'boolean',
    required: false,
  },
} as const;
