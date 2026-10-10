/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SchemaOutput } from '../schema_output';
import type {
  StatusCheckFiltersType,
  AtomicStatusCheckParamsType,
  StatusCheckParamsType,
  RangeUnitType,
  GetMonitorAvailabilityParamsType,
  MonitorAvailabilityType,
} from '../schemas/alerts';

export type StatusCheckFilters = SchemaOutput<typeof StatusCheckFiltersType>;
export type AtomicStatusCheckParams = SchemaOutput<typeof AtomicStatusCheckParamsType>;
export type RangeUnit = SchemaOutput<typeof RangeUnitType>;
export type StatusCheckParams = SchemaOutput<typeof StatusCheckParamsType>;
export type GetMonitorAvailabilityParams = SchemaOutput<typeof GetMonitorAvailabilityParamsType>;
export type MonitorAvailability = SchemaOutput<typeof MonitorAvailabilityType>;
