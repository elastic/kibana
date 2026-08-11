/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiText, EuiIcon, EuiInMemoryTable, type HorizontalAlignment } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useMemo, useState } from 'react';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import { AddMetadataFilterButton } from './add_metadata_filter_button';
import { ExpandableContent } from '../../components/expandable_content';
import { type Field, getRowsWithPins } from './utils';
import { AddMetadataPinToRow } from './add_pin_to_row';

export interface Props {
  rows: Field[];
  loading: boolean;
  showActionsColumn?: boolean;
  search?: string;
}

/**
 * Columns translations
 */
const FIELD_LABEL = i18n.translate('xpack.infra.metadataEmbeddable.field', {
  defaultMessage: 'Field',
});

const VALUE_LABEL = i18n.translate('xpack.infra.metadataEmbeddable.value', {
  defaultMessage: 'Value',
});

/**
 * Component translations
 */
const NO_METADATA_FOUND = i18n.translate('xpack.infra.metadataEmbeddable.noMetadataFound', {
  defaultMessage: 'No metadata found.',
});

const LOADING = i18n.translate('xpack.infra.metadataEmbeddable.loading', {
  defaultMessage: 'Loading...',
});

const LOCAL_STORAGE_PINNED_METADATA_ROWS = 'hostsView:pinnedMetadataRows';

export const Table = ({ loading, rows, search, showActionsColumn }: Props) => {
  const [fieldsWithPins, setFieldsWithPins] = useState(rows);

  const [pinnedItems, setPinnedItems] = useLocalStorage<Array<Field['name']>>(
    LOCAL_STORAGE_PINNED_METADATA_ROWS,
    []
  );

  useMemo(() => {
    if (pinnedItems) {
      setFieldsWithPins(getRowsWithPins(rows, pinnedItems) ?? rows);
    }
  }, [rows, pinnedItems]);

  const defaultColumns = useMemo(
    () => [
      {
        field: 'value',
        name: (
          <EuiIcon
            type="pin"
            aria-label={i18n.translate('xpack.infra.metadataEmbeddable.pinFieldsColumn.ariaLabel', {
              defaultMessage: 'Pin fields',
            })}
          />
        ),
        align: 'center' as HorizontalAlignment,
        width: '5%',
        sortable: false,
        render: (_name: string, item: Field) => {
          return (
            <AddMetadataPinToRow
              fieldName={item.name}
              pinnedItems={pinnedItems ?? []}
              onPinned={setPinnedItems}
            />
          );
        },
      },
      {
        field: 'name',
        name: FIELD_LABEL,
        width: '35%',
        sortable: false,
        render: (name: string) => <EuiText size="s">{name}</EuiText>,
      },
      {
        field: 'value',
        name: VALUE_LABEL,
        width: '50%',
        sortable: false,
        render: (_name: string, item: Field) => (
          <ExpandableContent fieldName={item.name} values={item.value} />
        ),
      },
    ],
    [pinnedItems, setPinnedItems]
  );

  const filteredItems = useMemo(() => {
    if (!search) return fieldsWithPins;
    const lowerSearch = search.toLowerCase();
    return fieldsWithPins.filter(
      (field) =>
        field.name.toLowerCase().includes(lowerSearch) ||
        (Array.isArray(field.value)
          ? field.value.some((v) => String(v).toLowerCase().includes(lowerSearch))
          : String(field.value).toLowerCase().includes(lowerSearch))
    );
  }, [fieldsWithPins, search]);

  const columns = useMemo(
    () =>
      showActionsColumn
        ? [
            ...defaultColumns,
            {
              field: 'value',
              name: 'Actions',
              sortable: false,
              align: 'center' as HorizontalAlignment,
              render: (_name: string, item: Field) => {
                return <AddMetadataFilterButton item={item} />;
              },
            },
          ]
        : defaultColumns,
    [defaultColumns, showActionsColumn]
  );

  return (
    <EuiInMemoryTable
      data-test-subj="infraAssetDetailsMetadataTable"
      tableLayout="fixed"
      responsiveBreakpoint={false}
      columns={columns}
      items={filteredItems}
      loading={loading}
      tableCaption={i18n.translate('xpack.infra.metadataEmbeddable.metadataCaption', {
        defaultMessage: 'Metadata entries',
      })}
      noItemsMessage={
        loading ? (
          <div data-test-subj="infraAssetDetailsMetadataLoading">{LOADING}</div>
        ) : (
          <div data-test-subj="infraAssetDetailsMetadataNoData">{NO_METADATA_FOUND}</div>
        )
      }
    />
  );
};
