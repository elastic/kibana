/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { registerLegacyAndMultiSpaceTests } from '../fixtures/legacy_multispace_shared';

/**
 * Ported from the `Private location` describe of FTR
 * `apis/synthetics/legacy_and_multispace_monitor_api.ts`. Exercises the
 * legacy/multi-space monitor CRUD, filtering, search and space-validation
 * coverage against an all-spaces private location.
 */
registerLegacyAndMultiSpaceTests({
  usePrivateLocations: true,
  suiteName: 'LegacyAndMultiSpaceMonitorAPI - Private location',
});
