/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  requiredSiemMigrationCapabilities,
  type CapabilitiesLevel,
  type MissingCapability,
} from '../../common/service/capabilities';

/** Workflow migrations reuse the shared SIEM migrations privileges (create/start/poll). */
export const requiredWorkflowMigrationCapabilities: Record<
  CapabilitiesLevel,
  MissingCapability[]
> = {
  minimum: [...requiredSiemMigrationCapabilities.minimum],
  all: [...requiredSiemMigrationCapabilities.all],
};
