/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { shallow } from 'enzyme';

import { BodyRow } from './body_row';
import { BodyRows } from './body_rows';
import { DraggableBodyRow } from './draggable_body_row';
import { DraggableBodyRows } from './draggable_body_rows';
import { HeaderRow } from './header_row';
import { ReorderableTable } from './reorderable_table';
import { Column } from './types';

interface Foo {
  id: number;
}

describe('ReorderableTable', () => {
  const items: Foo[] = [{ id: 1 }, { id: 2 }];
  const columns: Array<Column<Foo>> = [];

  describe('when the table is reorderable', () => {
    it('renders with a header that has an additional column injected as the first column, which is empty', () => {
      const wrapper = shallow(
        <ReorderableTable noItemsMessage={<p>No Items</p>} items={items} columns={columns} />
      );
      const header = wrapper.find(HeaderRow);
      expect(header.exists()).toEqual(true);
      expect(header.prop('columns')).toEqual(columns);
      expect(header.prop('leftAction')).not.toBeUndefined();
    });

    it('renders draggable rows inside of the reorderable table', () => {
      const wrapper = shallow(
        <ReorderableTable noItemsMessage={<p>No Items</p>} items={items} columns={columns} />
      );
      const bodyRows = wrapper.find(DraggableBodyRows);
      expect(bodyRows.exists()).toBe(true);
      expect(bodyRows.prop('items')).toEqual(items);

      const renderedRow = bodyRows.renderProp('renderItem')({ id: 1 }, 0);
      expect(renderedRow.type()).toEqual(DraggableBodyRow);
      expect(renderedRow.props()).toEqual({
        columns,
        item: { id: 1 },
        additionalProps: {},
        disableDragging: false,
        rowIndex: 0,
      });
    });

    it('can append additional properties to each row, which can be dynamically calculated from the item in that row', () => {
      const wrapper = shallow(
        <ReorderableTable
          noItemsMessage={<p>No Items</p>}
          items={items}
          columns={columns}
          rowProps={(item) => ({
            className: `someClassName_${item.id}`,
          })}
        />
      );
      const renderedRow = wrapper.find(DraggableBodyRows).renderProp('renderItem')({ id: 1 }, 0);
      expect(renderedRow.prop('additionalProps')).toEqual({
        className: 'someClassName_1',
      });
    });

    it('will disableDragging on individual rows if disableDragging is enabled', () => {
      const wrapper = shallow(
        <ReorderableTable
          noItemsMessage={<p>No Items</p>}
          items={items}
          columns={columns}
          disableDragging
        />
      );
      const renderedRow = wrapper.find(DraggableBodyRows).renderProp('renderItem')({ id: 1 }, 0);
      expect(renderedRow.prop('disableDragging')).toEqual(true);
    });

    it('will accept a callback which will be triggered every time a row is reordered', () => {
      const onReorder = jest.fn();
      const wrapper = shallow(
        <ReorderableTable
          noItemsMessage={<p>No Items</p>}
          items={items}
          columns={columns}
          onReorder={onReorder}
        />
      );
      expect(wrapper.find(DraggableBodyRows).prop('onReorder')).toEqual(onReorder);
    });

    it('will provide a default callback for reordered if none is provided, which does nothing', () => {
      const wrapper = shallow(
        <ReorderableTable noItemsMessage={<p>No Items</p>} items={items} columns={columns} />
      );
      const onReorder = wrapper.find(DraggableBodyRows).prop('onReorder');
      expect(onReorder([], [])).toBeUndefined();
    });

    it('will render items that cant be reordered', () => {
      const unreorderableItems = [{ id: 3 }];
      const wrapper = shallow(
        <ReorderableTable
          noItemsMessage={<p>No Items</p>}
          items={items}
          unreorderableItems={unreorderableItems}
          columns={columns}
        />
      );
      const bodyRows = wrapper.find(BodyRows);
      expect(bodyRows.exists()).toBe(true);
      expect(bodyRows.prop('items')).toEqual(unreorderableItems);

      const renderedRow = bodyRows.renderProp('renderItem')({ id: 1 }, 0);
      expect(renderedRow.type()).toEqual(BodyRow);
      expect(renderedRow.props()).toEqual({
        columns,
        item: { id: 1 },
        additionalProps: {},
        leftAction: expect.anything(),
      });
    });

    it('will render bottom rows that cant be reordered', () => {
      const bottomRows = [<div />, <div />];
      const wrapper = shallow(
        <ReorderableTable
          noItemsMessage={<p>No Items</p>}
          items={items}
          bottomRows={bottomRows}
          columns={columns}
        />
      );

      expect(wrapper.find('[data-test-subj="BottomRow"]')).toHaveLength(2);
    });
  });

  describe('when reorderable is turned off on the table', () => {
    it('renders a table with a header and non-reorderable rows', () => {
      const wrapper = shallow(
        <ReorderableTable
          noItemsMessage={<p>No Items</p>}
          items={items}
          columns={columns}
          disableReordering
        />
      );
      const bodyRows = wrapper.find(BodyRows);
      expect(bodyRows.exists()).toBe(true);
      expect(bodyRows.prop('items')).toEqual(items);

      const renderedRow = bodyRows.renderProp('renderItem')({ id: 1 }, 0);
      expect(renderedRow.type()).toEqual(BodyRow);
      expect(renderedRow.props()).toEqual({
        columns,
        item: { id: 1 },
        additionalProps: {},
      });
    });

    it('can append additional properties to each row, which can be dynamically calculated from the item in that row', () => {
      const wrapper = shallow(
        <ReorderableTable
          noItemsMessage={<p>No Items</p>}
          items={items}
          columns={columns}
          rowProps={(item) => ({
            className: `someClassName_${item.id}`,
          })}
          disableReordering
        />
      );
      const renderedRow = wrapper.find(BodyRows).renderProp('renderItem')({ id: 1 }, 0);
      expect(renderedRow.prop('additionalProps')).toEqual({
        className: 'someClassName_1',
      });
    });
  });

  it('appends an additional className if specified', () => {
    const wrapper = shallow(
      <ReorderableTable noItemsMessage={<p>No Items</p>} items={[]} columns={[]} className="foo" />
    );

    expect(wrapper.hasClass('foo')).toBe(true);
  });

  it('will show a no items message when there are no items', () => {
    const wrapper = shallow(
      <ReorderableTable noItemsMessage={<p>No Items</p>} items={[]} columns={columns} />
    );

    expect(wrapper.find('[data-test-subj="NoItems"]').exists()).toBe(true);
    expect(wrapper.find(BodyRows).exists()).toBe(false);
    expect(wrapper.find(DraggableBodyRows).exists()).toBe(false);
  });
});
