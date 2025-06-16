/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { alertsFieldMap8180 } from '../8.18.0';
import {
  ALERT_ORIGINAL_DATA_STREAM_DATASET,
  ALERT_ORIGINAL_DATA_STREAM_NAMESPACE,
  ALERT_ORIGINAL_DATA_STREAM_TYPE,
} from '../field_names';

export const alertsFieldMap8190 = {
  ...alertsFieldMap8180,
  /**
   * An alternate location for the source data's original data_stream fields. So
   * that they can be used in sorting/filtering, allow multiple values, and not
   * conflict with the official ECS `constant_keyword` mapping for these fields,
   * we apply a `keyword` mapping in this alternate location
   */
  [ALERT_ORIGINAL_DATA_STREAM_DATASET]: {
    type: 'keyword',
    array: false,
    required: false,
  },
  [ALERT_ORIGINAL_DATA_STREAM_NAMESPACE]: {
    type: 'keyword',
    array: false,
    required: false,
  },
  [ALERT_ORIGINAL_DATA_STREAM_TYPE]: {
    type: 'keyword',
    array: false,
    required: false,
  },
} as const;

export type AlertsFieldMap8190 = typeof alertsFieldMap8190;
