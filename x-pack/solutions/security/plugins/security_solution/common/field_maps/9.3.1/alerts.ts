/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ENRICHMENT_DESTINATION_PATH } from '../../constants';
import { alertsFieldMap930 } from '../9.3.0';

export const alertsFieldMap931 = {
  ...alertsFieldMap930,
  [ENRICHMENT_DESTINATION_PATH]: {
    type: 'nested',
    array: false,
    required: false,
  },
  [`${ENRICHMENT_DESTINATION_PATH}.matched.atomic`]: {
    type: 'keyword',
    array: false,
    required: false,
    ignore_above: 1024,
  },
  [`${ENRICHMENT_DESTINATION_PATH}.matched.field`]: {
    type: 'keyword',
    array: false,
    required: false,
    ignore_above: 1024,
  },
  [`${ENRICHMENT_DESTINATION_PATH}.matched.id`]: {
    type: 'keyword',
    array: false,
    required: false,
    ignore_above: 1024,
  },
  [`${ENRICHMENT_DESTINATION_PATH}.matched.index`]: {
    type: 'keyword',
    array: false,
    required: false,
    ignore_above: 1024,
  },
  [`${ENRICHMENT_DESTINATION_PATH}.matched.type`]: {
    type: 'keyword',
    array: false,
    required: false,
    ignore_above: 1024,
  },

  [`${ENRICHMENT_DESTINATION_PATH}.indicator.description`]: {
    type: 'keyword',
    array: false,
    required: false,
    ignore_above: 1024,
  },
  [`${ENRICHMENT_DESTINATION_PATH}.indicator.first_seen`]: {
    type: 'date',
    array: false,
    required: false,
  },
  [`${ENRICHMENT_DESTINATION_PATH}.indicator.last_seen`]: {
    type: 'date',
    array: false,
    required: false,
  },
  [`${ENRICHMENT_DESTINATION_PATH}.indicator.name`]: {
    type: 'keyword',
    array: false,
    required: false,
    ignore_above: 1024,
  },
  [`${ENRICHMENT_DESTINATION_PATH}.indicator.provider`]: {
    type: 'keyword',
    array: false,
    required: false,
    ignore_above: 1024,
  },
  [`${ENRICHMENT_DESTINATION_PATH}.indicator.reference`]: {
    type: 'keyword',
    array: false,
    required: false,
    ignore_above: 1024,
  },
  [`${ENRICHMENT_DESTINATION_PATH}.indicator.type`]: {
    type: 'keyword',
    array: false,
    required: false,
    ignore_above: 1024,
  },

  [`${ENRICHMENT_DESTINATION_PATH}.feed.name`]: {
    type: 'keyword',
    array: false,
    required: false,
    ignore_above: 1024,
  },
} as const;

export type AlertsFieldMap931 = typeof alertsFieldMap931;
