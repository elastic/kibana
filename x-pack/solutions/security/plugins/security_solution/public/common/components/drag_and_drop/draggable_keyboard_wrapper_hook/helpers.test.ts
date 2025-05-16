/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { draggableKeyDownHandler } from './helpers';

jest.mock('../../../lib/kibana');
describe('draggableKeyDownHandler', () => {
  test('it calles the proper function cancelDragActions when Escape key was pressed', () => {
    const mockElement = document.createElement('div');
    const keyboardEvent = new KeyboardEvent('keydown', {
      ctrlKey: false,
      key: 'Escape',
      metaKey: false,
    }) as unknown as React.KeyboardEvent;

    const cancelDragActions = jest.fn();
    draggableKeyDownHandler({
      closePopover: jest.fn(),
      openPopover: jest.fn(),
      beginDrag: jest.fn(),
      cancelDragActions,
      draggableElement: mockElement,
      dragActions: null,
      dragToLocation: jest.fn(),
      endDrag: jest.fn(),
      keyboardEvent,
      setDragActions: jest.fn(),
    });
    expect(cancelDragActions).toBeCalled();
  });
});
