/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALL_VALUE } from '@kbn/slo-schema';
import type { SLODefinition } from '../../domain/models';

export const getSloApmLabels = (slo: SLODefinition) => ({
  slo_indicator_type: slo.indicator.type,
  slo_budgeting_method: slo.budgetingMethod,
  slo_time_window: `${slo.timeWindow.type}_${slo.timeWindow.duration.format()}`,
  slo_has_group_by: slo.groupBy !== ALL_VALUE,
  slo_prevent_initial_backfill: slo.settings.preventInitialBackfill,
});
