/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import { draggableKeyDownHandler } from './helpers';

vi.mock('../../../lib/kibana');
describe('draggableKeyDownHandler', () => {
  test('it calles the proper function cancelDragActions when Escape key was pressed', () => {
    const mockElement = document.createElement('div');
    const keyboardEvent = new KeyboardEvent('keydown', {
      ctrlKey: false,
      key: 'Escape',
      metaKey: false,
    }) as unknown as React.KeyboardEvent;

    const cancelDragActions = vi.fn();
    draggableKeyDownHandler({
      closePopover: vi.fn(),
      openPopover: vi.fn(),
      beginDrag: vi.fn(),
      cancelDragActions,
      draggableElement: mockElement,
      dragActions: null,
      dragToLocation: vi.fn(),
      endDrag: vi.fn(),
      keyboardEvent,
      setDragActions: vi.fn(),
    });
    expect(cancelDragActions).toHaveBeenCalled();
  });
});
