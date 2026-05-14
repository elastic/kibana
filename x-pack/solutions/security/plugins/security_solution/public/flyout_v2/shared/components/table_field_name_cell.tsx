/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { FieldIcon } from '@kbn/react-field';

const inferFieldType = (value: unknown): string => {
  if (value == null) return 'keyword';
  if (typeof value === 'boolean') return 'boolean';
  if (typeof value === 'number') return 'number';
  const str = Array.isArray(value) ? String(value[0] ?? '') : String(value);
  if (/^\d{4}-\d{2}-\d{2}T/.test(str)) return 'date';
  return 'keyword';
};

export interface TableFieldNameCellProps {
  field: string;
  rawValue: unknown;
}

export const TableFieldNameCell = memo(({ field, rawValue }: TableFieldNameCellProps) => {
  const type = inferFieldType(rawValue);

  return (
    <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
      <EuiFlexItem grow={false}>
        <FieldIcon type={type} />
      </EuiFlexItem>
      <EuiFlexItem>{field}</EuiFlexItem>
    </EuiFlexGroup>
  );
});

TableFieldNameCell.displayName = 'TableFieldNameCell';
