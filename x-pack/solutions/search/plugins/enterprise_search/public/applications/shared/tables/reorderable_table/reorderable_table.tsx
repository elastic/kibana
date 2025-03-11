/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import classNames from 'classnames';

import './reorderable_table.scss';

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

import { BodyRow } from './body_row';
import { BodyRows } from './body_rows';
import { DraggableBodyRow } from './draggable_body_row';
import { DraggableBodyRows } from './draggable_body_rows';
import { HeaderRow } from './header_row';
import { Column } from './types';

interface ReorderableTableProps<Item> {
  columns: Array<Column<Item>>;
  items: Item[];
  noItemsMessage: React.ReactNode;
  unreorderableItems?: Item[];
  bottomRows?: React.ReactNode[];
  className?: string;
  disableDragging?: boolean;
  disableReordering?: boolean;
  showRowIndex?: boolean;
  onReorder?: (items: Item[], oldItems: Item[]) => void;
  rowProps?: (item: Item) => object;
  rowErrors?: (item: Item) => string[] | undefined;
}

export const ReorderableTable = <Item extends object>({
  columns,
  items,
  noItemsMessage,
  unreorderableItems = [],
  bottomRows = [],
  className = '',
  disableDragging = false,
  disableReordering = false,
  onReorder = () => undefined,
  rowProps = () => ({}),
  rowErrors = () => undefined,
  showRowIndex = false,
}: ReorderableTableProps<Item>) => {
  return (
    <div className={classNames(className, 'reorderableTable')}>
      <HeaderRow
        columns={columns}
        leftAction={disableReordering ? undefined : <></>}
        spacingForRowIdentifier={showRowIndex}
      />

      {items.length === 0 && unreorderableItems.length === 0 && bottomRows.length === 0 && (
        <EuiFlexGroup alignItems="center" justifyContent="center">
          <EuiFlexItem data-test-subj="NoItems" className="reorderableTableNoItems">
            {noItemsMessage}
          </EuiFlexItem>
        </EuiFlexGroup>
      )}

      {items.length > 0 && disableReordering && (
        <BodyRows
          items={items}
          renderItem={(item, itemIndex) => (
            <BodyRow
              key={`table_draggable_row_${itemIndex}`}
              columns={columns}
              item={item}
              additionalProps={rowProps(item)}
              errors={rowErrors(item)}
              rowIdentifier={showRowIndex ? `${itemIndex + 1}` : undefined}
            />
          )}
        />
      )}

      {items.length > 0 && !disableReordering && (
        <>
          <DraggableBodyRows
            items={items}
            renderItem={(item, itemIndex) => (
              <DraggableBodyRow
                key={`table_draggable_row_${itemIndex}`}
                columns={columns}
                item={item}
                additionalProps={rowProps(item)}
                disableDragging={disableDragging}
                rowIndex={itemIndex}
                errors={rowErrors(item)}
                rowIdentifier={showRowIndex ? `${itemIndex + 1}` : undefined}
              />
            )}
            onReorder={onReorder}
          />
        </>
      )}
      <div className="unorderableRows">
        {unreorderableItems.length > 0 && (
          <BodyRows
            items={unreorderableItems}
            renderItem={(item, itemIndex) => (
              <BodyRow
                key={`table_draggable_row_${itemIndex}`}
                columns={columns}
                item={item}
                additionalProps={rowProps(item)}
                errors={rowErrors(item)}
                leftAction={disableReordering ? undefined : <> </>}
                rowIdentifier={showRowIndex ? '∞' : undefined}
              />
            )}
          />
        )}

        {bottomRows.map((row, rowIndex) => (
          <BodyRow // Shoving a generic ReactNode into a BodyRow is kind of a hack
            key={rowIndex}
            rowIdentifier={showRowIndex ? '∞' : undefined}
            columns={[{ render: () => row }]}
            item={{}}
            leftAction={disableReordering ? undefined : <> </>}
            data-test-subj="BottomRow"
          />
        ))}
      </div>
    </div>
  );
};
