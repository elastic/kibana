/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { alertsFieldMap8160 } from '../8.16.0';
import { ALERT_SERVICE_CRITICALITY } from '../field_names';

export const alertsFieldMap8180 = {
  ...alertsFieldMap8160,
  /**
   * Stores the criticality level for the host, as determined by analysts, in relation to the alert.
   * The Criticality level is copied from the asset criticality index.
   */
  [ALERT_SERVICE_CRITICALITY]: {
    type: 'keyword',
    array: false,
    required: false,
  },
} as const;

export type AlertsFieldMap8180 = typeof alertsFieldMap8180;
