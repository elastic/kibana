/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EntityType } from './definitions/constants';
import type { EntityStoreLogger } from '../infra/logging';

export class ResourcesService {
  logger: EntityStoreLogger;

  constructor(logger: EntityStoreLogger) {
    this.logger = logger;
  }

  install(types?: EntityType[]) {
    types = fallbackTypes(types);

    this.logger.info(`Should initialize entity store for types ${JSON.stringify(types)}`);
  }
}

const fallbackTypes = (types?: EntityType[]): EntityType[] => {
  if (!types) {
    return Object.values(EntityType.Values);
  }

  return types;
};
