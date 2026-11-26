/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { upperFirst } from 'lodash';
import type { InventoryType } from '@kbn/entity-inventory-plugin/common';

export const getCategoryLabel = (category: string): string => upperFirst(category);

export const getAttributeLabel = (types: InventoryType[], attribute: string): string =>
  types.flatMap(({ columns }) => columns).find(({ name, label }) => name === attribute && label)
    ?.label ?? attribute;
