/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiButtonIcon, EuiInMemoryTable } from '@elastic/eui';
import { getFlattenedObject } from '@kbn/std';
import { i18n } from '@kbn/i18n';
import { useQuery, useMutation } from 'react-query';
import { usePinnedFields } from './hooks/usePinnedFields'; // Import the custom hook
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
    const isAPinned = pinnedFields.includes(a.key);
    const isBPinned = pinnedFields.includes(b.key);

    if (isAPinned && !isBPinned) return -1;
    if (!isAPinned && isBPinned) return 1;
    return 0;
  });
};

export const FieldsTable: React.FC<FieldsTableProps> = ({ document, tableStorageKey }) => {
  // Use the custom hook and pass the tableStorageKey
  const { pinnedFields, togglePin } = usePinnedFields(tableStorageKey);

  // Filter the document based on the pinned fields
  const sortedItems = useMemo(
    () => getSortedFlattenedItems(document, pinnedFields),
    [document, pinnedFields]
  );

  const columns = useMemo(
    () => [
      {
        field: 'key',
        name: '',
        width: '40px',
        render: (fieldKey: string) => {
          const isPinned = pinnedFields.includes(fieldKey);
          return (
            <EuiButtonIcon
              iconType={isPinned ? 'pinFilled' : 'pin'}
              aria-label={isPinned ? 'Unpin field' : 'Pin field'}
              color={isPinned ? 'primary' : 'text'}
              onClick={() => togglePin(fieldKey)} // Use the togglePin function from the hook
            />
          );
        },
      },
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
    [pinnedFields]
  );

  return (
    <EuiInMemoryTable
      items={sortedItems}
      columns={columns}
      sorting={{ sort: { field: 'key', direction: 'asc' } }}
      search={{ box: { incremental: true } }}
      pagination={{ initialPageSize: 100, showPerPageOptions: false }}
    />
  );
};

// Helper function to get pinned fields from localStorage
const getPinnedFieldsFromLocalStorage = (storageKey: string): string[] => {
  const storedPinned = localStorage.getItem(storageKey);
  return storedPinned ? JSON.parse(storedPinned) : [];
};

// Helper function to set pinned fields in localStorage
const setPinnedFieldsInLocalStorage = (storageKey: string, fields: string[]) => {
  localStorage.setItem(storageKey, JSON.stringify(fields));
};

// Custom hook to manage pinned fields
export const usePinnedFields = (storageKey: string) => {
  // Use React Query to fetch the pinned fields from localStorage
  const { data: pinnedFields, refetch } = useQuery<string[]>(
    ['pinnedFields', storageKey],
    () => getPinnedFieldsFromLocalStorage(storageKey),
    { initialData: [] }
  );

  // Use React Query mutation to update the pinned fields
  const mutation = useMutation(
    (updatedPinnedFields: string[]) =>
      setPinnedFieldsInLocalStorage(storageKey, updatedPinnedFields),
    {
      onSuccess: () => {
        refetch();
      },
    }
  );

  const togglePin = (fieldKey: string) => {
    const updatedPinnedFields = pinnedFields.includes(fieldKey)
      ? pinnedFields.filter((key) => key !== fieldKey)
      : [...pinnedFields, fieldKey];

    // Update pinned fields in localStorage via mutation
    mutation.mutate(updatedPinnedFields);
  };

  return {
    pinnedFields,
    togglePin,
  };
};
