/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TimeRange } from '@kbn/es-query';

export const ENTITY_INVENTORY_APP_NAME = 'entityInventoryApp';

export const ENTITY_INVENTORY_MAX_TIME_RANGE_DAYS = 3;

export const DEFAULT_TIME_RANGE: TimeRange = { from: 'now-15m', to: 'now' };
