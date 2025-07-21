/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AggregationSchemaVariant } from '../../../shared/metrics/types';

export const load: AggregationSchemaVariant = {
  ecs: { load: { avg: { field: 'system.load.5' } } },
  semconv: { load: { avg: { field: 'system.cpu.load_average.5m' } } },
};
