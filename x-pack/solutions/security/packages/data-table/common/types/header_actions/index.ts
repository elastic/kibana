/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiDataGridColumn } from '@elastic/eui';
import type { IFieldSubType } from '@kbn/es-query';
import type { SerializedFieldFormat } from '@kbn/field-formats-plugin/common';

export type ColumnHeaderType = 'not-filtered' | 'text-filter';

/** Uniquely identifies a column */
export type ColumnId = string;

/** The specification of a column header */
export type ColumnHeaderOptions = Pick<
  EuiDataGridColumn,
  | 'actions'
  | 'defaultSortDirection'
  | 'display'
  | 'displayAsText'
  | 'id'
  | 'initialWidth'
  | 'isSortable'
  | 'schema'
  | 'isExpandable'
  | 'isResizable'
> & {
  aggregatable?: boolean;
  searchable?: boolean;
  category?: string;
  columnHeaderType: ColumnHeaderType;
  description?: string | null;
  esTypes?: string[];
  example?: string | number | null;
  format?: SerializedFieldFormat;
  linkField?: string;
  placeholder?: string;
  subType?: IFieldSubType;
  type?: string;
};
