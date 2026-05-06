/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import React, { memo, useMemo } from 'react';
import type { EuiBasicTableColumn } from '@elastic/eui';
import { EuiInMemoryTable } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FlyoutError } from '../components/flyout_error';

export interface TableTabItem {
  field: string;
  value: string | string[] | null;
}

export interface TableTabProps {
  items: TableTabItem[];
  tableCaption: string;
  isEmpty?: boolean;
  renderValue?: (field: string, value: string | string[] | null) => ReactNode;
  'data-test-subj'?: string;
  paginated?: boolean;
  searchPlaceholder?: string;
  fieldColumnWidth?: string;
}

const PAGINATION = { pageSizeOptions: [25, 50, 100] };

const stringifyValue = (value: string | string[] | null): string =>
  Array.isArray(value) ? value.join(', ') : String(value ?? '');

export const TableTab = memo(
  ({
    items,
    tableCaption,
    isEmpty = false,
    renderValue,
    'data-test-subj': dataTestSubj,
    paginated = false,
    searchPlaceholder,
    fieldColumnWidth = '30%',
  }: TableTabProps) => {
    const columns = useMemo<Array<EuiBasicTableColumn<TableTabItem>>>(
      () => [
        {
          field: 'field' as const,
          name: i18n.translate('xpack.securitySolution.flyout.shared.table.fieldColumnLabel', {
            defaultMessage: 'Field',
          }),
          sortable: true,
          width: fieldColumnWidth,
        },
        {
          name: i18n.translate('xpack.securitySolution.flyout.shared.table.valueColumnLabel', {
            defaultMessage: 'Value',
          }),
          render: (item: TableTabItem) =>
            renderValue ? renderValue(item.field, item.value) : stringifyValue(item.value),
          sortable: (item: TableTabItem) => stringifyValue(item.value),
        } as EuiBasicTableColumn<TableTabItem>,
      ],
      [fieldColumnWidth, renderValue]
    );

    const search = useMemo(
      () => ({
        box: {
          incremental: true,
          schema: true,
          ...(searchPlaceholder ? { placeholder: searchPlaceholder } : {}),
        },
      }),
      [searchPlaceholder]
    );

    if (isEmpty) return <FlyoutError />;

    return (
      <EuiInMemoryTable
        items={items}
        itemId="field"
        columns={columns}
        search={search}
        sorting
        pagination={paginated ? PAGINATION : false}
        data-test-subj={dataTestSubj}
        tableCaption={tableCaption}
      />
    );
  }
);

TableTab.displayName = 'TableTab';
