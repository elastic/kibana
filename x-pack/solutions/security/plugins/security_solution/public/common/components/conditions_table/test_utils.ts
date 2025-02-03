/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiTableFieldDataColumnType } from '@elastic/eui';

export interface TestItem {
  name: string;
  value: string;
}

export const TEST_COLUMNS: Array<EuiTableFieldDataColumnType<TestItem>> = [
  { field: 'name', name: 'Name', textOnly: true, width: '50%' },
  { field: 'value', name: 'Value', textOnly: true, width: '50%' },
];

export const createItems = (count: number): TestItem[] =>
  [...new Array(count).keys()].map((item) => ({ name: `item ${item}`, value: `value ${item}` }));
