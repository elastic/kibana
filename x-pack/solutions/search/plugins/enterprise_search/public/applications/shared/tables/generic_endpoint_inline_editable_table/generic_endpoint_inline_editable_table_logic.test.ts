/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const MOCK_SET_ROW_ERRORS = jest.fn();

jest.mock('../inline_editable_table/inline_editable_table_logic', () => ({
  InlineEditableTableLogic: () => ({
    actions: {
      setRowErrors: MOCK_SET_ROW_ERRORS,
    },
  }),
}));

import {
  LogicMounter,
  mockFlashMessageHelpers,
  mockHttpValues,
} from '../../../__mocks__/kea_logic';

import { nextTick } from '@kbn/test-jest-helpers';

import { GenericEndpointInlineEditableTableLogic } from './generic_endpoint_inline_editable_table_logic';

describe('GenericEndpointInlineEditableTableLogic', () => {
  const { mount } = new LogicMounter(GenericEndpointInlineEditableTableLogic);
  const { http } = mockHttpValues;
  const { toastAPIErrors } = mockFlashMessageHelpers;

  const DEFAULT_VALUES = {
    isLoading: false,
  };

  const DEFAULT_LOGIC_PARAMS = {
    dataProperty: 'foo',
    instanceId: 'MyInstance',
    addRoute: 'route/to/add/new/items',
    reorderRoute: 'route/to/reorder/items',
    deleteRoute: (item: any) => `route/to/delete/item/${item.id}`,
    updateRoute: (item: any) => `route/to/update/item/${item.id}`,
    onReorder: jest.fn(),
    onAdd: jest.fn(),
    onDelete: jest.fn(),
    onUpdate: jest.fn(),
  };

  beforeEach(() => {
    jest.resetAllMocks();
  });

  const mountLogic = (values: object = {}, props: object = DEFAULT_LOGIC_PARAMS) =>
    mount(values, props);

  it('has expected default values', () => {
    const logic = mountLogic();
    expect(logic.values).toEqual({
      ...DEFAULT_VALUES,
    });
  });

  describe('actions', () => {
    describe('setLoading', () => {
      it('sets isLoading to true', () => {
        const logic = mountLogic({
          isLoading: false,
        });
        logic.actions.setLoading();
        expect(logic.values).toEqual({
          ...DEFAULT_VALUES,
          isLoading: true,
        });
      });
    });

    describe('clearLoading', () => {
      it('sets isLoading to false', () => {
        const logic = mountLogic({
          isLoading: true,
        });
        logic.actions.clearLoading();
        expect(logic.values).toEqual({
          ...DEFAULT_VALUES,
          isLoading: false,
        });
      });
    });
  });

  describe('listeners', () => {
    describe('addItem', () => {
      const item = { id: 1 };
      const onSuccess = jest.fn();

      it('makes an API call', async () => {
        const mockResponse = {
          foo: { some: 'data' },
        };

        http.post.mockReturnValueOnce(Promise.resolve(mockResponse));
        const logic = mountLogic();
        jest.spyOn(logic.actions, 'clearLoading');

        logic.actions.addItem(item, onSuccess);

        // It sets isLoading to true before it stars the request
        expect(logic.values).toEqual({
          ...DEFAULT_VALUES,
          isLoading: true,
        });

        await nextTick();

        // It posts the provided 'item' to the configured 'adddRoute'
        expect(http.post).toHaveBeenCalledWith('route/to/add/new/items', {
          body: JSON.stringify({ id: 1 }),
        });

        // It retrieves data from the response based on the configured 'dataProperty'
        // Then calls back to the configured 'onAdd' function
        expect(DEFAULT_LOGIC_PARAMS.onAdd).toHaveBeenCalledWith({ id: 1 }, { some: 'data' });

        // It calls the onSuccess callback
        expect(onSuccess).toHaveBeenCalled();

        // Then it cleans up when it's done
        expect(logic.actions.clearLoading).toHaveBeenCalled();
      });

      it('passes API errors to the nested inline editable table', async () => {
        http.post.mockReturnValueOnce(Promise.reject('error'));
        const logic = mountLogic();
        logic.actions.addItem(item, onSuccess);
        await nextTick();

        expect(MOCK_SET_ROW_ERRORS).toHaveBeenCalledWith(['An unexpected error occurred']);
      });
    });

    describe('deleteItem', () => {
      const item = { id: 1 };
      const onSuccess = jest.fn();

      it('makes an API call', async () => {
        const mockResponse = {
          foo: { some: 'data' },
        };

        http.delete.mockReturnValueOnce(Promise.resolve(mockResponse));
        const logic = mountLogic();
        jest.spyOn(logic.actions, 'clearLoading');

        logic.actions.deleteItem(item, onSuccess);

        // It sets isLoading to true before it stars the request
        expect(logic.values).toEqual({
          ...DEFAULT_VALUES,
          isLoading: true,
        });

        await nextTick();

        // It deletes the 'item' using the configured 'deleteRoute'
        expect(http.delete).toHaveBeenCalledWith('route/to/delete/item/1');

        // It retrieves data from the response based on the configured 'dataProperty'
        // Then calls back to the configured 'onAdd' function
        expect(DEFAULT_LOGIC_PARAMS.onDelete).toHaveBeenCalledWith({ id: 1 }, { some: 'data' });

        // It calls the onSuccess callback
        expect(onSuccess).toHaveBeenCalled();

        // Then it cleans up when it's done
        expect(logic.actions.clearLoading).toHaveBeenCalled();
      });

      it('passes errors to the nested inline editable table', async () => {
        http.delete.mockReturnValueOnce(Promise.reject('error'));
        const logic = mountLogic();
        logic.actions.deleteItem(item, onSuccess);
        await nextTick();

        expect(MOCK_SET_ROW_ERRORS).toHaveBeenCalledWith(['An unexpected error occurred']);
      });
    });

    describe('updateItem', () => {
      const item = { id: 1, other: 'other', created_at: '5/17/1984' };
      const onSuccess = jest.fn();

      it('makes an API call', async () => {
        const mockResponse = {
          foo: { some: 'data' },
        };

        http.put.mockReturnValueOnce(Promise.resolve(mockResponse));
        const logic = mountLogic();
        jest.spyOn(logic.actions, 'clearLoading');

        logic.actions.updateItem(item, onSuccess);

        // It sets isLoading to true before it stars the request
        expect(logic.values).toEqual({
          ...DEFAULT_VALUES,
          isLoading: true,
        });

        await nextTick();

        // It updates the 'item' using the configured 'updateRoute', with the id
        // and created_at stripped from the object
        expect(http.put).toHaveBeenCalledWith('route/to/update/item/1', {
          body: JSON.stringify({ other: 'other' }),
        });

        // It retrieves data from the response based on the configured 'dataProperty'
        // Then calls back to the configured 'onAdd' function
        expect(DEFAULT_LOGIC_PARAMS.onUpdate).toHaveBeenCalledWith(
          { id: 1, other: 'other', created_at: '5/17/1984' },
          { some: 'data' }
        );

        // It calls the onSuccess callback
        expect(onSuccess).toHaveBeenCalled();

        // Then it cleans up when it's done
        expect(logic.actions.clearLoading).toHaveBeenCalled();
      });

      it('passes errors to the nested inline editable table', async () => {
        http.put.mockReturnValueOnce(Promise.reject('error'));
        const logic = mountLogic();
        logic.actions.updateItem(item, onSuccess);
        await nextTick();

        expect(MOCK_SET_ROW_ERRORS).toHaveBeenCalledWith(['An unexpected error occurred']);
      });
    });

    describe('reorderItems', () => {
      const items = [{ id: 2 }, { id: 1 }];
      const oldItems = [{ id: 1 }, { id: 2 }];
      const onSuccess = jest.fn();

      it('makes an API call', async () => {
        const mockResponse = {
          foo: [{ id: 2 }, { id: 1 }],
        };
        http.put.mockReturnValueOnce(Promise.resolve(mockResponse));

        const logic = mountLogic();
        jest.spyOn(logic.actions, 'setLoading');
        jest.spyOn(logic.actions, 'clearLoading');

        logic.actions.reorderItems(items, oldItems, onSuccess);

        // It calls back to the configured 'onReorder' function
        expect(DEFAULT_LOGIC_PARAMS.onReorder).toHaveBeenCalledWith(items);

        // Sets loading state
        expect(logic.actions.setLoading).toHaveBeenCalled();

        await nextTick();

        // Updates the reordered items on the server using the configured 'reorderRoute'
        // and 'dataProperty'. It also injects 'order' properties.
        expect(http.put).toHaveBeenCalledWith('route/to/reorder/items', {
          body: JSON.stringify({
            foo: [
              {
                id: 2,
                order: 0,
              },
              {
                id: 1,
                order: 1,
              },
            ],
          }),
        });

        // It again calls back to the configured 'onReorder' function with items
        // it parsed back from the response using the 'dataProperty' config
        expect(DEFAULT_LOGIC_PARAMS.onReorder).toHaveBeenCalledWith(items);

        // It calls the onSuccess callback
        expect(onSuccess).toHaveBeenCalled();

        // Then it cleans up when it's done
        expect(logic.actions.clearLoading).toHaveBeenCalled();
      });

      it('handles errors', async () => {
        http.put.mockReturnValueOnce(Promise.reject('error'));
        const logic = mountLogic();

        logic.actions.reorderItems(items, oldItems, onSuccess);
        await nextTick();

        // It again calls back to the configured 'onReorder' to reset the order
        expect(DEFAULT_LOGIC_PARAMS.onReorder).toHaveBeenCalledWith(oldItems);
        expect(toastAPIErrors).toHaveBeenCalledWith('error');
      });

      it('does nothing if there are no reorder props', async () => {
        const { reorderRoute, ...rest } = DEFAULT_LOGIC_PARAMS;
        const logic = mountLogic({}, rest);
        logic.actions.reorderItems(items, oldItems, onSuccess);
        expect(http.put).not.toHaveBeenCalled();
      });
    });
  });
});
