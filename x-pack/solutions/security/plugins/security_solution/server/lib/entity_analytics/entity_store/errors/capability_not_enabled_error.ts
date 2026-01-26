/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityStoreCapability } from '@kbn/entities-schema';

export class CapabilityNotEnabledError extends Error {
  constructor(capability: EntityStoreCapability) {
    super(`Capability ${capability} not enabled on this cluster. Please restart entity store `);
  }
}
