/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiDraggable, EuiFlexGroup, EuiFlexItem, EuiIcon } from '@elastic/eui';

import { BodyRow } from './body_row';
import { Column } from './types';

export interface DraggableBodyRowProps<Item> {
  columns: Array<Column<Item>>;
  item: Item;
  rowIndex: number;
  additionalProps?: object;
  disableDragging?: boolean;
  errors?: string[];
  rowIdentifier?: string;
}

export const DraggableBodyRow = <Item extends object>({
  columns,
  item,
  rowIndex,
  additionalProps,
  disableDragging = false,
  errors,
  rowIdentifier,
}: DraggableBodyRowProps<Item>) => {
  const draggableId = `draggable_row_${rowIndex}`;

  return (
    <EuiDraggable
      index={rowIndex}
      draggableId={draggableId}
      isDragDisabled={disableDragging}
      disableInteractiveElementBlocking={disableDragging}
      {...additionalProps}
    >
      <BodyRow
        columns={columns}
        item={item}
        additionalProps={additionalProps}
        leftAction={
          <EuiFlexGroup justifyContent="spaceBetween">
            <EuiFlexItem>
              {disableDragging ? <div style={{ width: '16px' }} /> : <EuiIcon type="grab" />}
            </EuiFlexItem>
          </EuiFlexGroup>
        }
        rowIdentifier={rowIdentifier}
        errors={errors}
      />
    </EuiDraggable>
  );
};
