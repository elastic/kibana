/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockActions, setMockValues } from '../../../__mocks__/kea_logic';

import React from 'react';

import { shallow } from 'enzyme';

import { InlineEditableTable } from '../inline_editable_table';

import { GenericEndpointInlineEditableTable } from './generic_endpoint_inline_editable_table';

describe('GenericEndpointInlineEditableTable', () => {
  const mockValues = {
    isLoading: false,
  };
  const mockActions = {
    addItem: jest.fn(),
    deleteItem: jest.fn(),
    reorderItems: jest.fn(),
    updateItem: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    setMockActions(mockActions);
    setMockValues(mockValues);
  });

  const items = [{ id: 1 }, { id: 2 }];

  const props = {
    dataProperty: 'foo',
    instanceId: 'MyInstance',
    addRoute: 'route/to/add/new/items',
    reorderRoute: 'route/to/reorder/items',
    deleteRoute: (item: any) => `route/to/delete/item/${item.id}`,
    updateRoute: (item: any) => `route/to/update/item/${item.id}`,
    onReorder: mockActions.reorderItems,
    onAdd: mockActions.addItem,
    onDelete: mockActions.deleteItem,
    onUpdate: mockActions.updateItem,
    columns: [],
    items,
    title: 'Some Title',
  };

  it('renders', () => {
    const wrapper = shallow(<GenericEndpointInlineEditableTable {...props} />);
    expect(wrapper.find(InlineEditableTable).exists()).toBe(true);
    expect(wrapper.find(InlineEditableTable).prop('isLoading')).toEqual(false);
    expect(wrapper.find(InlineEditableTable).prop('title')).toEqual('Some Title');
  });
});
