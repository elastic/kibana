/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InventoryCellScalar, InventoryCellValue } from '../../inventory_api/types';

/** The value of a cell, or the first value of a multi-value cell; `null` when there is none. */
export const getFirstScalar = (value: InventoryCellValue | undefined): InventoryCellScalar =>
  (Array.isArray(value) ? value[0] : value) ?? null;
