/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityStoreLogger } from '../infra/logging';
import type { ResourcesService } from './resources_service';

export interface EntityStoreDependencies {
  resourcesService: ResourcesService;
  logger: EntityStoreLogger;
}
