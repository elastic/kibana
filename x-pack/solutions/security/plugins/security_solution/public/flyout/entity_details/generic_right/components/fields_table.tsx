/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo } from 'react';
import type { EuiInMemoryTableProps } from '@elastic/eui';
import { EuiCode, EuiCodeBlock, EuiText, EuiButtonIcon, EuiInMemoryTable } from '@elastic/eui';
import { getFlattenedObject } from '@kbn/std';
import { i18n } from '@kbn/i18n';
/**
 * ## IMPORTANT TODO ##
 * This file imports @elastic/ecs directly, which imports all ECS fields into the bundle.
 * This should be migrated to using the unified fields metadata plugin instead.
 * See https://github.com/elastic/kibana/tree/main/x-pack/platform/plugins/shared/fields_metadata for more details.
 */
// eslint-disable-next-line no-restricted-imports
import { EcsFlat } from '@elastic/ecs';
import { useQuery, useQueryClient } from '@kbn/react-query';
import { TableFieldNameCell } from '../../../document_details/right/components/table_field_name_cell';

interface FlattenedItem {
  key: string; // Flattened dot notation object path for an object;
  value: unknown;
}

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

  return flattenedItems.sort((a, b) => {
    const isAPinned = pinnedFields?.includes(a.key);
    const isBPinned = pinnedFields?.includes(b.key);

    if (isAPinned && !isBPinned) return -1;
    if (!isAPinned && isBPinned) return 1;
    return 0; // Keep original order if neither are pinned
  });
};

const getPinnedFieldsFromLocalStorage = (storageKey: string): string[] => {
  const storedPinned = localStorage.getItem(storageKey);
  return storedPinned ? JSON.parse(storedPinned) : [];
};

const setPinnedFieldsInLocalStorage = (storageKey: string, fields: string[]) => {
  localStorage.setItem(storageKey, JSON.stringify(fields));
};

export const usePinnedFields = (storageKey: string, defaultPinnedFields?: string[]) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    const hasStoredPinnedFields = !!getPinnedFieldsFromLocalStorage(storageKey)?.length;
    const hasDefaultPinnedFields = !!defaultPinnedFields?.length;

    // If no pinned fields exist in localStorage, set the default fields
    if (!hasStoredPinnedFields && hasDefaultPinnedFields) {
      setPinnedFieldsInLocalStorage(storageKey, defaultPinnedFields);
      queryClient.setQueryData(['pinnedFields', storageKey], defaultPinnedFields);
      queryClient.invalidateQueries(['pinnedFields', storageKey]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    queryClient.invalidateQueries(['pinnedFields', storageKey]);
  };

  return {
    pinnedFields,
    togglePin,
  };
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
   * Optional key to override component's defaults or set custom behaviors.
   */
  euiInMemoryTableProps?: Partial<EuiInMemoryTableProps>;

  /**
   * Set default fields if storage key does not exist.
   */
  defaultPinnedFields?: string[];
}

/**
 * Displays a table of flattened fields and values with an option to pin items to the top.
 */
export const FieldsTable: React.FC<FieldsTableProps> = ({
  document,
  tableStorageKey,
  euiInMemoryTableProps,
  defaultPinnedFields,
}) => {
  const { pinnedFields, togglePin } = usePinnedFields(
    tableStorageKey || 'fields-table-pins',
    defaultPinnedFields
  );

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
          <div css={{ width: '100%' }}>{getDescriptionDisplay(value)}</div>
        ),
      },
    ],
    [pinnedFields, tableStorageKey, togglePin]
  );

  return (
    <EuiInMemoryTable<FlattenedItem>
      tableCaption={i18n.translate('xpack.securitySolution.fieldsTable.tableCaption', {
        defaultMessage: 'Fields',
      })}
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
