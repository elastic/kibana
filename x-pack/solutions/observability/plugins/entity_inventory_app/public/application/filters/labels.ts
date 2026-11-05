/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { upperFirst } from 'lodash';
import type { EntityInventoryTypeDefinition } from '../../inventory_api_types';

export const getCategoryLabel = (category: string): string => upperFirst(category);

export const getAttributeLabel = (
  types: EntityInventoryTypeDefinition[],
  attribute: string
): string =>
  types
    .flatMap(({ attributes }) => attributes)
    .find(({ name, label }) => name === attribute && label)?.label ?? attribute;
