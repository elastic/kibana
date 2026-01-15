/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiBasicTable,
  EuiText,
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import type { EuiBasicTableColumn } from '@elastic/eui';
import type { FieldDiff } from '../../../../common/endpoint_assets';

interface FieldDiffDisplayProps {
  diffs: FieldDiff[];
  dateA: string;
  dateB: string;
}

const formatValue = (value: unknown): string => {
  if (value === undefined || value === null) {
    return '-';
  }
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return String(value);
};

const getChangeTypeBadge = (changeType: 'added' | 'removed' | 'modified') => {
  switch (changeType) {
    case 'added':
      return <EuiBadge color="success">Added</EuiBadge>;
    case 'removed':
      return <EuiBadge color="danger">Removed</EuiBadge>;
    case 'modified':
      return <EuiBadge color="warning">Modified</EuiBadge>;
    default:
      return null;
  }
};

const getValueColor = (
  changeType: 'added' | 'removed' | 'modified',
  isValueA: boolean
): 'danger' | 'success' | 'default' => {
  if (changeType === 'added') {
    return isValueA ? 'default' : 'success';
  }
  if (changeType === 'removed') {
    return isValueA ? 'danger' : 'default';
  }
  return 'default';
};

export const FieldDiffDisplay: React.FC<FieldDiffDisplayProps> = React.memo(
  ({ diffs, dateA, dateB }) => {
    const columns: Array<EuiBasicTableColumn<FieldDiff>> = useMemo(
      () => [
        {
          field: 'field_path',
          name: 'Field',
          width: '35%',
          render: (fieldPath: string) => (
            <EuiText size="s">
              <code>{fieldPath}</code>
            </EuiText>
          ),
        },
        {
          field: 'value_a',
          name: dateA,
          width: '25%',
          render: (value: unknown, diff: FieldDiff) => {
            const color = getValueColor(diff.change_type, true);
            return (
              <EuiText size="s" color={color}>
                {formatValue(value)}
              </EuiText>
            );
          },
        },
        {
          field: 'value_b',
          name: dateB,
          width: '25%',
          render: (value: unknown, diff: FieldDiff) => {
            const color = getValueColor(diff.change_type, false);
            return (
              <EuiText size="s" color={color}>
                {formatValue(value)}
              </EuiText>
            );
          },
        },
        {
          field: 'change_type',
          name: 'Change',
          width: '15%',
          render: (changeType: 'added' | 'removed' | 'modified') =>
            getChangeTypeBadge(changeType),
        },
      ],
      [dateA, dateB]
    );

    if (diffs.length === 0) {
      return (
        <EuiFlexGroup justifyContent="center" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiText size="s" color="subdued">
              No field differences
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      );
    }

    return (
      <EuiBasicTable
        items={diffs}
        columns={columns}
        tableLayout="auto"
        compressed
      />
    );
  }
);

FieldDiffDisplay.displayName = 'FieldDiffDisplay';
