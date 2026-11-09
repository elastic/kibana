/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { EntityStoreSetupContract } from '@kbn/entity-store/server';
import { K8S_ENTITY_DEFINITIONS } from './k8s_definitions';

/** Registers the inventory's entity definitions with the entity store; a rejection is logged, not thrown. */
export const registerInventoryDefinitions = (
  entityStore: EntityStoreSetupContract,
  logger: Logger
): void => {
  K8S_ENTITY_DEFINITIONS.forEach((definition) => {
    const result = entityStore.registerEntityDefinition(definition);
    if (!result.ok) {
      logger.warn(
        `Entity inventory could not register the ${definition.type} definition: ${result.reason}`
      );
    }
  });
};
