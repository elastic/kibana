/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityInventoryEntityCategory } from '../../types';

// TODO: replace the prefixes once entity definitions carry a category.
export const ENTITY_TYPE_ID_PREFIX_BY_CATEGORY: Readonly<
  Partial<Record<EntityInventoryEntityCategory, string>>
> = {
  hosts: 'host',
  kubernetes: 'k8s.',
};

export const getCategoryOfType = (type: string): EntityInventoryEntityCategory | undefined =>
  (
    Object.entries(ENTITY_TYPE_ID_PREFIX_BY_CATEGORY) as Array<
      [EntityInventoryEntityCategory, string]
    >
  ).find(([, prefix]) => type.startsWith(prefix))?.[0];
