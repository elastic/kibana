/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LegacySiemSignals } from './types';

export const getInitialLegacySiemSignalsUsage = (): LegacySiemSignals => ({
  non_migrated_indices_total: 0,
  spaces_total: 0,
});
