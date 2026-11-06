/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { EntityDefinitionsClient, RegisteredEntityDefinition } from '@kbn/entity-store/server';
import { isEqual } from 'lodash';
import { MANAGED_BY } from '../definitions/constants';
import { buildColumns, getDynamicBlock, resolveIdentityPlan } from './generator';
import type { GetTypesResponse, InventoryType } from './types';

export class InventoryService {
  constructor(
    private readonly definitionsClient: Pick<EntityDefinitionsClient, 'list'>,
    private readonly logger: Logger
  ) {}

  /**
   * Returns one entry per registered definition that has a `dynamic` block and `managedBy` equal to
   * `MANAGED_BY` (registered by this plugin), in registry order.
   * Skips a definition that throws `InventoryDefinitionError` after logging a warning, and rethrows any other error.
   */
  listTypes = async (): Promise<GetTypesResponse> => {
    const definitions = await this.definitionsClient.list();
    const types = definitions.flatMap((definition) => {
      if (!definition.dynamic || !isEqual(definition.managedBy, MANAGED_BY)) {
        return [];
      }
      try {
        return [this.buildType(definition)];
      } catch (error) {
        if (error.name !== 'InventoryDefinitionError') {
          throw error;
        }
        this.logger.warn(`Entity inventory skipped type "${definition.type}": ${error.message}`);
        return [];
      }
    });
    return { types };
  };

  private buildType = (definition: RegisteredEntityDefinition): InventoryType => {
    const { type, name, description } = definition;
    const { sources } = getDynamicBlock(definition);
    const identityPlan = resolveIdentityPlan(definition);
    const columns = buildColumns(
      definition,
      sources.map(({ attributes }, index) => ({ index, attributes: attributes ?? [] })),
      identityPlan
    );
    return {
      type,
      name,
      description,
      identityFields: identityPlan.groupingFields,
      columns: columns.map(({ name: columnName, kind }) => ({ name: columnName, kind })),
      sources: sources.map(({ indexPattern, filter }) => ({ indexPattern, filter })),
    };
  };
}
