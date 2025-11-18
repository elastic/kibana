/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataViewFieldBase } from '@kbn/es-query';

export interface FormattedEntry {
  id: string;
  field: DataViewFieldBase | undefined;
  type: 'mapping';
  value: DataViewFieldBase | undefined;
  entryIndex: number;
  negate?: boolean;
}
