/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityType } from '@kbn/securitysolution-api';

export class EngineNotRunningError extends Error {
  constructor(engine: EntityType) {
    super(`Entity Engine '${engine}' is not running`);
  }
}
