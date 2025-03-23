/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiInMemoryTableProps } from '@elastic/eui';
import { EuiCode, EuiCodeBlock, EuiInMemoryTable, EuiText } from '@elastic/eui';
import React from 'react';
import { getFlattenedObject } from '@kbn/std';
import { i18n } from '@kbn/i18n';
import { EcsFlat } from '@elastic/ecs';
import { TableFieldNameCell } from '../../../document_details/right/components/table_field_name_cell';

interface FlattenedItem {
  key: string; // flattened dot notation object path for an object;
  value: unknown;
}

const getDescriptionDisplay = (value: unknown) => {
  if (value === undefined) return 'undefined';
  if (typeof value === 'boolean' || value === null) {
    return <EuiCode>{JSON.stringify(value)}</EuiCode>;
  }

  if (typeof value === 'object') {
    return (
      <EuiCodeBlock isCopyable={true} overflowHeight={300}>
        {JSON.stringify(value, null, 2)}
      </EuiCodeBlock>
    );
  }

  return <EuiText size="s">{value as string}</EuiText>;
};

const search: EuiInMemoryTableProps<FlattenedItem>['search'] = {
  box: {
    incremental: true,
  },
};

const sorting: EuiInMemoryTableProps<FlattenedItem>['sorting'] = {
  sort: {
    field: 'key',
    direction: 'asc',
  },
};

const pagination: EuiInMemoryTableProps<FlattenedItem>['pagination'] = {
  initialPageSize: 100,
  showPerPageOptions: false,
};

const isValidEcsField = (fieldName: string): fieldName is keyof typeof EcsFlat =>
  fieldName in EcsFlat;

const columns: EuiInMemoryTableProps<FlattenedItem>['columns'] = [
  {
    field: 'key',
    name: i18n.translate('xpack.securitySolution.fieldsTable.fieldColumnLabel', {
      defaultMessage: 'Field',
    }),
    width: '25%',
    render: (fieldName: keyof typeof EcsFlat | string, flattenedItem) => {
      let dataType: string = typeof flattenedItem.value;
      if (isValidEcsField(fieldName)) {
        dataType = EcsFlat[fieldName].type;
      }

      return <TableFieldNameCell field={fieldName} dataType={dataType} />;
    },
  },
  {
    field: 'value',
    name: i18n.translate('xpack.securitySolution.fieldsTable.valueColumnLabel', {
      defaultMessage: 'Value',
    }),
    render: (value: unknown) => <div style={{ width: '100%' }}>{getDescriptionDisplay(value)}</div>,
  },
];

const getFlattenedItems = (resource: Record<string, unknown>) =>
  Object.entries(getFlattenedObject(resource)).map(([key, value]) => ({ key, value }));

/**
 * A component that displays a table of flattened fields and values from a resource object.
 */
export const FieldsTable = ({ document }: { document: Record<string, unknown> }) => (
  <EuiInMemoryTable
    items={getFlattenedItems(document)}
    columns={columns}
    sorting={sorting}
    search={search}
    pagination={pagination}
  />
);
