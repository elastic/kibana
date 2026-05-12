/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactElement, ReactNode } from 'react';
import React, { memo, useMemo } from 'react';
import type { EuiBasicTableColumn } from '@elastic/eui';
import {
  EuiButtonIcon,
  EuiInMemoryTable,
  EuiToolTip,
  useEuiFontSize,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { FlyoutError } from '../components/flyout_error';
import type { CellActionRenderer } from '../components/cell_actions';
import { TABLE_TAB_PIN_ACTION_TEST_ID } from '../components/test_ids';

export interface TableTabItem {
  field: string;
  value: string | string[] | null;
  /** Original un-stringified value from the document, used for cell actions. */
  rawValue?: unknown;
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
  toolsRight?: ReactElement | ReactElement[];
  /** Fields that are currently pinned — shown in a filled pin icon and sorted first by the caller. */
  pinnedFields?: readonly string[];
  /** Called when the user clicks the pin/unpin icon. Providing this prop shows the pin column. */
  onPinField?: (field: string, action: 'pin' | 'unpin') => void;
  /** Custom renderer for the field name cell (e.g. to add a type icon). */
  renderFieldName?: (field: string) => ReactNode;
  /** Fields whose rows should receive a highlighted background color. */
  highlightedFields?: readonly string[];
  /** When 'xs', rows render with the EUI xs font size. */
  rowFontSize?: 'xs';
  /** Wraps each value cell with cell actions (filter, copy, etc.) */
  renderCellActions?: CellActionRenderer;
  scopeId?: string;
}

const PAGINATION = { pageSizeOptions: [25, 50, 100] };

const stringifyValue = (value: string | string[] | null): string =>
  Array.isArray(value) ? value.join(', ') : String(value ?? '');

const PIN_ROW_CSS = css`
  .flyout_table__unPinAction {
    opacity: 1;
  }
  .flyout_table__pinAction {
    opacity: 0;
  }
  &:hover {
    .flyout_table__pinAction {
      opacity: 1;
    }
  }
`;

const PIN_LABEL = i18n.translate('xpack.securitySolution.flyout.shared.table.pinField', {
  defaultMessage: 'Pin field',
});

const UNPIN_LABEL = i18n.translate('xpack.securitySolution.flyout.shared.table.unpinField', {
  defaultMessage: 'Unpin field',
});

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
    toolsRight,
    pinnedFields,
    onPinField,
    renderFieldName,
    highlightedFields,
    rowFontSize,
    renderCellActions,
    scopeId = '',
  }: TableTabProps) => {
    const { euiTheme } = useEuiTheme();
    const { fontSize: xsFontSize } = useEuiFontSize('xs');

    const columns = useMemo<Array<EuiBasicTableColumn<TableTabItem>>>(() => {
      const cols: Array<EuiBasicTableColumn<TableTabItem>> = [];

      if (onPinField) {
        cols.push({
          width: '32px',
          name: '',
          sortable: false,
          render: (item: TableTabItem) => {
            const isPinned = pinnedFields?.includes(item.field) ?? false;
            return (
              <EuiToolTip content={isPinned ? UNPIN_LABEL : PIN_LABEL} disableScreenReaderOutput>
                <EuiButtonIcon
                  iconType={isPinned ? 'pinFilled' : 'pin'}
                  aria-label={isPinned ? UNPIN_LABEL : PIN_LABEL}
                  className={isPinned ? 'flyout_table__unPinAction' : 'flyout_table__pinAction'}
                  onClick={() => onPinField(item.field, isPinned ? 'unpin' : 'pin')}
                  size="xs"
                  color="text"
                  data-test-subj={TABLE_TAB_PIN_ACTION_TEST_ID}
                />
              </EuiToolTip>
            );
          },
        } as unknown as EuiBasicTableColumn<TableTabItem>);
      }

      cols.push({
        field: 'field' as const,
        name: i18n.translate('xpack.securitySolution.flyout.shared.table.fieldColumnLabel', {
          defaultMessage: 'Field',
        }),
        sortable: true,
        width: fieldColumnWidth,
        render: (fieldName: string) => (renderFieldName ? renderFieldName(fieldName) : fieldName),
      });

      cols.push({
        name: i18n.translate('xpack.securitySolution.flyout.shared.table.valueColumnLabel', {
          defaultMessage: 'Value',
        }),
        render: (item: TableTabItem) => {
          const content = renderValue
            ? renderValue(item.field, item.value)
            : stringifyValue(item.value);
          if (renderCellActions) {
            return renderCellActions({
              field: item.field,
              value: (item.rawValue ?? item.value) as Parameters<CellActionRenderer>[0]['value'],
              scopeId,
              children: content,
            });
          }
          return content;
        },
        sortable: (item: TableTabItem) => stringifyValue(item.value),
      } as EuiBasicTableColumn<TableTabItem>);

      return cols;
    }, [
      fieldColumnWidth,
      onPinField,
      pinnedFields,
      renderCellActions,
      renderFieldName,
      renderValue,
      scopeId,
    ]);

    const search = useMemo(
      () => ({
        box: {
          incremental: true,
          schema: true,
          placeholder: searchPlaceholder,
        },
        toolsRight,
      }),
      [searchPlaceholder, toolsRight]
    );

    const rowProps = useMemo(
      () =>
        highlightedFields || onPinField
          ? (item: TableTabItem) => ({
              style: highlightedFields?.includes(item.field)
                ? { backgroundColor: euiTheme.colors.backgroundBaseWarning }
                : undefined,
              css: onPinField ? PIN_ROW_CSS : undefined,
            })
          : undefined,
      [euiTheme.colors.backgroundBaseWarning, highlightedFields, onPinField]
    );

    const tableCss = useMemo(
      () =>
        rowFontSize
          ? css`
              .euiTableRow {
                font-size: ${xsFontSize};
              }
            `
          : undefined,
      [rowFontSize, xsFontSize]
    );

    if (isEmpty) return <FlyoutError />;

    return (
      <EuiInMemoryTable
        items={items}
        itemId="field"
        columns={columns}
        search={search}
        sorting={!onPinField}
        pagination={paginated ? PAGINATION : false}
        data-test-subj={dataTestSubj}
        tableCaption={tableCaption}
        rowProps={rowProps}
        css={tableCss}
      />
    );
  }
);

TableTab.displayName = 'TableTab';
