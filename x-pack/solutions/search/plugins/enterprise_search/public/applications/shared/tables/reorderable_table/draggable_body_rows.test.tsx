/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { shallow } from 'enzyme';

import { EuiDragDropContext } from '@elastic/eui';

import { BodyRows } from './body_rows';
import { DraggableBodyRows } from './draggable_body_rows';

describe('DraggableBodyRows', () => {
  const items = [{ id: 1 }, { id: 2 }];
  const onReorder = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('wraps BodyRows in a EuiDragDropContext', () => {
    const renderItem = jest.fn();
    const wrapper = shallow(
      <DraggableBodyRows items={items} onReorder={onReorder} renderItem={renderItem} />
    );

    expect(wrapper.find(EuiDragDropContext).exists()).toBe(true);

    const bodyRows = wrapper.find(BodyRows);
    expect(bodyRows.props()).toEqual({
      items,
      renderItem,
    });
  });

  it('will call the provided onReorder function whenever items are reordered', () => {
    const wrapper = shallow(
      <DraggableBodyRows items={items} onReorder={onReorder} renderItem={jest.fn()} />
    );
    wrapper.find(EuiDragDropContext).simulate('dragEnd', {
      source: { index: 1 },
      destination: { index: 0 },
    });
    expect(onReorder).toHaveBeenCalledWith([{ id: 2 }, { id: 1 }], items);
  });

  it('will not call the provided onReorder function if there are not a source AND destination provided', () => {
    const wrapper = shallow(
      <DraggableBodyRows items={items} onReorder={onReorder} renderItem={jest.fn()} />
    );
    wrapper.find(EuiDragDropContext).simulate('dragEnd', {
      source: { index: 1 },
    });
    expect(onReorder).not.toHaveBeenCalled();
  });
});
