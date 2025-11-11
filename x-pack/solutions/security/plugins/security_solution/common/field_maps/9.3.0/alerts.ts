/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { alertsFieldMap8190 } from '../8.19.0';
import { ALERT_ATTACK_IDS } from '../field_names';

export const alertsFieldMap930 = {
  ...alertsFieldMap8190,
  [ALERT_ATTACK_IDS]: {
    type: 'keyword',
    array: true,
    required: false,
  },
} as const;

export type AlertsFieldMap930 = typeof alertsFieldMap8190;
