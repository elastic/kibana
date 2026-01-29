/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import {
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiToken,
  useEuiTheme,
} from '@elastic/eui';

import { Cell } from './cell';
import { DRAGGABLE_UX_STYLE } from './constants';
import * as Styles from './styles';
import type { Column } from './types';

export interface BodyRowProps<Item> {
  additionalProps?: object;
  ariaRowindex?: number;
  columns: Array<Column<Item>>;
  errors?: string[];
  item: Item;
  // Cell to put in first column before other columns
  leftAction?: React.ReactNode;
  rowIdentifier?: string;
}

export const BodyRow = <Item extends object>({
  additionalProps,
  ariaRowindex,
  columns,
  errors = [],
  item,
  leftAction,
  rowIdentifier,
}: BodyRowProps<Item>) => {
  const { euiTheme } = useEuiTheme();
  // Calculate column index offset based on presence of leftAction and rowIdentifier
  const columnIndexOffset = (leftAction ? 1 : 0) + (rowIdentifier ? 1 : 0);

  return (
    <div className="reorderableTableRow">
      <EuiFlexGroup
        data-test-subj="row"
        alignItems="center"
        role="row"
        aria-rowindex={ariaRowindex}
        {...(additionalProps || {})}
      >
        <EuiFlexItem css={Styles.bodyRowItemStyles(euiTheme)}>
          <EuiFlexGroup alignItems="center">
            {leftAction && (
              <Cell {...DRAGGABLE_UX_STYLE} role="cell" ariaColindex={1}>
                {leftAction}
              </Cell>
            )}
            {rowIdentifier && (
              <Cell
                {...DRAGGABLE_UX_STYLE}
                flexBasis="24px"
                role="cell"
                ariaColindex={leftAction ? 2 : 1}
              >
                <EuiToken
                  size="m"
                  iconType={() => (
                    <EuiText size="xs">
                      <strong>{rowIdentifier}</strong>
                    </EuiText>
                  )}
                />
              </Cell>
            )}
            {columns.map((column, columnIndex) => (
              <Cell
                key={`table_row_cell_${columnIndex}`}
                alignItems={column.alignItems}
                flexBasis={column.flexBasis}
                flexGrow={column.flexGrow}
                role="cell"
                ariaColindex={columnIndex + columnIndexOffset + 1}
              >
                {column.render(item)}
              </Cell>
            ))}
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
      {errors.length > 0 && (
        <EuiFlexGroup direction="column">
          {errors.map((errorMessage, errorMessageIndex) => (
            <EuiFlexItem key={errorMessageIndex}>
              <EuiCallOut
                announceOnMount
                role="alert"
                aria-live="polite"
                iconType="warning"
                size="s"
                color="danger"
                title={errorMessage}
              />
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>
      )}
    </div>
  );
};
