/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { alertsFieldMap } from '../8.0.0';

export const alertsFieldMap840 = {
  ...alertsFieldMap,
  'kibana.alert.new_terms': {
    type: 'keyword',
    array: true,
    required: false,
  },
} as const;

export type AlertsFieldMap840 = typeof alertsFieldMap840;
