/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { alertsFieldMap931 } from '../9.3.1';
import { ALERT_ENTITY_ID } from '../field_names';

export const alertsFieldMap960 = {
  ...alertsFieldMap931,
  [ALERT_ENTITY_ID]: {
    type: 'keyword',
    array: true,
    required: false,
    ignore_above: 1024,
  },
} as const;

export type AlertsFieldMap960 = typeof alertsFieldMap960;
