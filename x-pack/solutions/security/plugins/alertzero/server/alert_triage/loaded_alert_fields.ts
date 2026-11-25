/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_ANALYSIS_FIELDS } from '@kbn/workflows/managed';
import { PATTERN_KEY_FIELDS } from './pattern_key';

/**
 * What `loadAlertsByIds` fetches of each alert: the fields Alert Analysis reads, the pattern keys,
 * the proposal text and the entity ids. Leaf paths only, so a large object such as `process.args`
 * never travels.
 */
export const LOADED_ALERT_FIELDS: readonly string[] = [
  ...new Set([
    ...ALERT_ANALYSIS_FIELDS,
    ...PATTERN_KEY_FIELDS,
    'host.id',
    'host.name',
    'user.name',
    'process.executable',
  ]),
];
