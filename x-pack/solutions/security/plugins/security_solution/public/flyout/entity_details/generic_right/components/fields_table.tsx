/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import type { EuiInMemoryTableProps } from '@elastic/eui';
import { EuiButtonIcon, EuiInMemoryTable } from '@elastic/eui';
import { getFlattenedObject } from '@kbn/std';
import { i18n } from '@kbn/i18n';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { TableFieldNameCell } from '../../../document_details/right/components/table_field_name_cell';

interface FlattenedItem {
  key: string;
  value: unknown;
}

const getSortedFlattenedItems = (
  document: Record<string, unknown>,
  pinnedFields: string[]
): FlattenedItem[] => {
  const flattenedItems = Object.entries(getFlattenedObject(document)).map(([key, value]) => ({
    key,
    value,
  }));

  return flattenedItems.sort((a, b) => {
    const isAPinned = pinnedFields?.includes(a.key);
    const isBPinned = pinnedFields?.includes(b.key);

    if (isAPinned && !isBPinned) return -1;
    if (!isAPinned && isBPinned) return 1;
    return 0;
  });
};

export interface FieldsTableProps {
  document: Record<string, unknown>;
  tableStorageKey?: string;
  euiInMemoryTableProps?: Partial<EuiInMemoryTableProps>;
}

export const FieldsTable: React.FC<FieldsTableProps> = ({
  document,
  tableStorageKey,
  euiInMemoryTableProps,
}) => {
  const { pinnedFields, togglePin } = usePinnedFields(tableStorageKey || 'fields-table-pins');

  const sortedItems: FlattenedItem[] = useMemo(
    () => getSortedFlattenedItems(document, pinnedFields),
    [document, pinnedFields]
  );

  const columns = useMemo(
    () => [
      ...(tableStorageKey
        ? [
            {
              field: 'key',
              name: '',
              width: '40px',
              render: (fieldKey: string) => {
                const isPinned = pinnedFields?.includes(fieldKey);
                return (
                  <EuiButtonIcon
                    iconType={isPinned ? 'pinFilled' : 'pin'}
                    aria-label={isPinned ? 'Unpin field' : 'Pin field'}
                    color={isPinned ? 'primary' : 'text'}
                    onClick={() => togglePin(fieldKey)}
                  />
                );
              },
            },
          ]
        : []),
      {
        field: 'key',
        name: i18n.translate('xpack.securitySolution.fieldsTable.fieldColumnLabel', {
          defaultMessage: 'Field',
        }),
        width: '25%',
        render: (fieldName: string, flattenedItem: FlattenedItem) => {
          const dataType: string = typeof flattenedItem.value;
          return <TableFieldNameCell field={fieldName} dataType={dataType} />;
        },
      },
      {
        field: 'value',
        name: i18n.translate('xpack.securitySolution.fieldsTable.valueColumnLabel', {
          defaultMessage: 'Value',
        }),
        render: (value: unknown) => (
          <div style={{ width: '100%' }}>{JSON.stringify(value, null, 2)}</div>
        ),
      },
    ],
    [pinnedFields, tableStorageKey, togglePin]
  );

  return (
    <EuiInMemoryTable<FlattenedItem>
      // @ts-ignore
      items={sortedItems}
      columns={columns}
      sorting={{ sort: { field: 'key', direction: 'asc' } }}
      search={{ box: { incremental: true } }}
      pagination={{ initialPageSize: 100, showPerPageOptions: false }}
      {...euiInMemoryTableProps}
    />
  );
};

const getPinnedFieldsFromLocalStorage = (storageKey: string): string[] => {
  const storedPinned = localStorage.getItem(storageKey);
  return storedPinned ? JSON.parse(storedPinned) : [];
};

const setPinnedFieldsInLocalStorage = (storageKey: string, fields: string[]) => {
  localStorage.setItem(storageKey, JSON.stringify(fields));
};

export const usePinnedFields = (storageKey: string) => {
  const queryClient = useQueryClient();

  const { data: pinnedFields = [] } = useQuery<string[]>({
    queryKey: ['pinnedFields', storageKey],
    queryFn: () => getPinnedFieldsFromLocalStorage(storageKey),
    initialData: getPinnedFieldsFromLocalStorage(storageKey) || [],
  });

  const togglePin = (fieldKey: string) => {
    const updatedPinnedFields = pinnedFields.includes(fieldKey)
      ? pinnedFields.filter((key) => key !== fieldKey)
      : [...pinnedFields, fieldKey];

    setPinnedFieldsInLocalStorage(storageKey, updatedPinnedFields);
    queryClient.setQueryData(['pinnedFields', storageKey], updatedPinnedFields);
  };

  return {
    pinnedFields,
    togglePin,
  };
};
