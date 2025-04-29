/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import type { EuiInMemoryTableProps } from '@elastic/eui';
import { EuiCode, EuiCodeBlock, EuiInMemoryTable, EuiText, EuiButtonIcon } from '@elastic/eui';
import { getFlattenedObject } from '@kbn/std';
import { i18n } from '@kbn/i18n';
import { EcsFlat } from '@elastic/ecs';
import { TableFieldNameCell } from '../../../document_details/right/components/table_field_name_cell';

interface FlattenedItem {
  key: string; // Flattened dot notation object path for an object;
  value: unknown;
}

const TABLE_PINS_STORAGE_KEY = 'pinned_fields';

const isValidEcsField = (fieldName: string): fieldName is keyof typeof EcsFlat =>
  fieldName in EcsFlat;

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

const getSortedFlattenedItems = (
  document: Record<string, unknown>,
  pinnedFields: string[]
): FlattenedItem[] => {
  const flattenedItems = Object.entries(getFlattenedObject(document)).map(([key, value]) => ({
    key,
    value,
  }));

  const sortedItems = flattenedItems.sort((a, b) => {
    const isAPinned = pinnedFields.includes(a.key);
    const isBPinned = pinnedFields.includes(b.key);

    if (isAPinned && !isBPinned) return -1;
    if (!isAPinned && isBPinned) return 1;
    return 0; // Keep original order if neither are pinned
  });

  return sortedItems;
};

export interface FieldsTableProps {
  /**
   * The document object containing the fields and values to be displayed in the table.
   */
  document: Record<string, unknown>;

  /**
   * Optional key to store pinned fields in localStorage.
   * If provided, pinned fields will be saved under this key.
   * If not provided, pinning functionality will be disabled.
   */
  tableStorageKey?: string;

  /**
   * Disables the search box when set to true.
   * Default is false, enabling the search box.
   */
  disableSearch?: boolean;

  /**
   * If true, only pinned fields will be shown in the table.
   * Default is false, showing all fields.
   */
  onlyShowPinnedFields?: boolean;

  /**
   * If true, hides the pinning functionality (no pin buttons are shown).
   * Default is false, where pinning functionality is enabled.
   */
  hidePins?: boolean;
}

/**
 * Displays a table of flattened fields and values with an option to pin items to the top.
 */
export const FieldsTable: React.FC<FieldsTableProps> = ({
  document,
  tableStorageKey,
  disableSearch = false,
  onlyShowPinnedFields = false,
  hidePins = false,
}) => {
  const storageKey = tableStorageKey ? `${TABLE_PINS_STORAGE_KEY}-${tableStorageKey}` : null;
  const [pinnedFields, setPinnedFields] = useState<string[]>([]);

  // load pinned fields from localStorage into state if a storageKey is provided
  useEffect(() => {
    if (!storageKey) return;
    const storedPinned = localStorage.getItem(storageKey);
    if (storedPinned) {
      setPinnedFields(JSON.parse(storedPinned));
    }
  }, [storageKey]);

  // Listen to changes from other tabs or components
  useEffect(() => {
    if (!storageKey) return;

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === storageKey) {
        const newPinnedFields = event.newValue ? JSON.parse(event.newValue) : [];
        setPinnedFields(newPinnedFields);
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [storageKey]);

  const togglePin = useCallback(
    (fieldKey: string) => {
      if (!storageKey) return;

      setPinnedFields((prev) => {
        const updatedPinned = prev.includes(fieldKey)
          ? prev.filter((key) => key !== fieldKey)
          : [...prev, fieldKey];

        const updatedPinnedString = JSON.stringify(updatedPinned);
        localStorage.setItem(storageKey, updatedPinnedString);

        // Fire custom event for same-tab listeners
        window.dispatchEvent(
          new StorageEvent('storage', {
            key: storageKey,
            newValue: updatedPinnedString,
            storageArea: localStorage,
          })
        );

        return updatedPinned;
      });
    },
    [setPinnedFields, storageKey]
  );

  const sortedItems = getSortedFlattenedItems(document, pinnedFields);

  // Only show pinned fields if `onlyShowPinnedFields` is true
  const displayedItems = onlyShowPinnedFields
    ? sortedItems.filter((item) => pinnedFields.includes(item.key))
    : sortedItems;

  const columns: EuiInMemoryTableProps<FlattenedItem>['columns'] = useMemo(
    () => [
      ...(storageKey && !hidePins
        ? [
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
        render: (fieldName: keyof typeof EcsFlat | string, flattenedItem: FlattenedItem) => {
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
        render: (value: unknown) => (
          <div style={{ width: '100%' }}>{getDescriptionDisplay(value)}</div>
        ),
      },
    ],
    [pinnedFields, storageKey, togglePin, hidePins]
  );

  return (
    <EuiInMemoryTable
      items={displayedItems}
      columns={columns}
      sorting={{ sort: { field: 'key', direction: 'asc' } }}
      search={disableSearch ? undefined : { box: { incremental: true } }}
      pagination={{ initialPageSize: 100, showPerPageOptions: false }}
    />
  );
};
