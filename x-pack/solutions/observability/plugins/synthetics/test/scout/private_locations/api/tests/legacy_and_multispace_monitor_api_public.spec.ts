/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { registerLegacyAndMultiSpaceTests } from '../fixtures/legacy_multispace_shared';

/**
 * Ported from the `Public location` describe of FTR
 * `apis/synthetics/legacy_and_multispace_monitor_api.ts` (tagged `skipCloud`
 * there). Exercises the same legacy/multi-space monitor CRUD, filtering and
 * search coverage against the Elastic-managed `dev` public location.
 */
registerLegacyAndMultiSpaceTests({
  usePrivateLocations: false,
  suiteName: 'LegacyAndMultiSpaceMonitorAPI - Public location',
});
