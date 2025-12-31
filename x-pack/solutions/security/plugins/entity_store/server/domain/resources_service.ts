/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EntityType } from './definitions/entity_type';
import type { EntityStoreLogger } from '../infra/logging';

export class ResourcesService {
  logger: EntityStoreLogger;

  constructor(logger: EntityStoreLogger) {
    this.logger = logger;
  }

  install(types?: EntityType[]) {
    types = this.getTypesOrDefault(types);

    this.logger.info(`Should initialize entity store for types ${JSON.stringify(types)}`);
  }

  private getTypesOrDefault(types?: EntityType[]): EntityType[] {
    if (!types) {
      return Object.values(EntityType.Values);
    }

    return types;
  }
}
