/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ESQLColumn } from '@kbn/es-types';
import type { ESQLValue, InventoryRow } from './types';

export const esqlResultsToRows = (columns: ESQLColumn[], values: ESQLValue[][]): InventoryRow[] =>
  values.map((cells) => Object.fromEntries(columns.map(({ name }, index) => [name, cells[index]])));
