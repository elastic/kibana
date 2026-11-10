/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityDefinitionManagedBy } from '@kbn/entity-store/common';

/** Marks a definition as registered by this plugin, as the entity store requires. */
export const MANAGED_BY: EntityDefinitionManagedBy = { kind: 'plugin', id: 'entityInventory' };
