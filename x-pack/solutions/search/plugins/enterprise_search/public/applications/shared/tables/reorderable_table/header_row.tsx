/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiFlexGroup, EuiFlexItem, EuiScreenReaderOnly, EuiText } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { Cell } from './cell';
import { DRAGGABLE_UX_STYLE } from './constants';
import type { Column } from './types';

interface HeaderRowProps<Item> {
  columns: Array<Column<Item>>;
  // Cell to put in first column before other columns
  leftAction?: React.ReactNode;
  spacingForRowIdentifier?: boolean;
}

export const HeaderRow = <Item extends object>({
  columns,
  leftAction,
  spacingForRowIdentifier = false,
}: HeaderRowProps<Item>) => {
  // Calculate column index offset based on presence of leftAction and rowIdentifier
  const columnIndexOffset = (leftAction ? 1 : 0) + (spacingForRowIdentifier ? 1 : 0);

  return (
    <div className="reorderableTableHeader" role="rowgroup">
      <EuiFlexGroup role="row" aria-rowindex={1}>
        <EuiFlexItem>
          <EuiFlexGroup>
            {leftAction && (
              <Cell {...DRAGGABLE_UX_STYLE} role="columnheader" ariaColindex={1}>
                {leftAction}
              </Cell>
            )}
            {spacingForRowIdentifier && (
              <Cell
                {...DRAGGABLE_UX_STYLE}
                flexBasis="24px"
                role="columnheader"
                ariaColindex={leftAction ? 2 : 1}
              >
                <EuiScreenReaderOnly>
                  <p>
                    {i18n.translate(
                      'xpack.enterpriseSearch.reorderableTable.rowIdentifierScreenReaderOnlyLabel',
                      { defaultMessage: 'Row identifier' }
                    )}
                  </p>
                </EuiScreenReaderOnly>
              </Cell>
            )}
            {columns.map((column, columnIndex) => (
              <Cell
                key={`table_header_cell_${columnIndex}`}
                {...column}
                role="columnheader"
                ariaColindex={columnIndex + columnIndexOffset + 1}
              >
                <EuiText size="s">
                  <strong>{column.name}</strong>
                </EuiText>
              </Cell>
            ))}
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
};
