/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DynamicBlock, EntityDefinitionWithoutId } from '@kbn/entity-store/common';
import { InventoryDefinitionError } from './errors';

/** Returns the `dynamic` block of a definition, throwing when it has none since the inventory cannot query it. */
export const getDynamicBlock = (definition: EntityDefinitionWithoutId): DynamicBlock => {
  const { dynamic, type } = definition;
  if (!dynamic) {
    throw new InventoryDefinitionError(
      `definition "${type}" has no dynamic block; the inventory cannot query it`
    );
  }
  return dynamic;
};
