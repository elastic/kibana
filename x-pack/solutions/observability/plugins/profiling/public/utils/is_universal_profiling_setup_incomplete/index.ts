/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UniversalProfilingSchemaStatus } from '@kbn/profiling-utils';

/** Whether Universal Profiling has data the app shows even though its setup is incomplete. Data
 * from before 8.9.1 is excluded: it must be deleted rather than set up. */
export const isUniversalProfilingSetupIncomplete = ({
  isAvailable,
  hasData,
  hasSetup,
  hasLegacyData,
}: UniversalProfilingSchemaStatus): boolean =>
  isAvailable && hasData && !hasSetup && !hasLegacyData;
