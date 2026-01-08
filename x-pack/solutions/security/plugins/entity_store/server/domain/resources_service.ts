/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { EntityType } from './definitions/entity_type';
import { ALL_ENTITY_TYPES } from './definitions/entity_type';
import type { Task } from './tasks';

export class ResourcesService {
  constructor(private logger: Logger, private extractEntityTask: Task) {}

  public async install(entityTypes: EntityType[] = ALL_ENTITY_TYPES) {
    this.logger.info(`Should initialize entity store for types ${JSON.stringify(entityTypes)}`);
    entityTypes.forEach(this.extractEntityTask.schedule);
  }
}
