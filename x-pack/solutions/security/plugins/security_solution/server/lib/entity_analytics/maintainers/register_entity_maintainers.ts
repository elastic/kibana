/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash';
import type { EntityMaintainerRegistry } from './entity_maintainer_registry';
import * as maintainerDefs from './all_definitions';

export const registerEntityMaintainers = (registry: EntityMaintainerRegistry) => {
  for (const defName of Object.keys(maintainerDefs).filter((key) => key !== 'default')) {
    const def = get(maintainerDefs, defName);
    if (def) registry.register(def);
  }
};
