/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

const MockPrompt = vi.fn<(...args: [object]) => null>(() => null);
vi.mock('react-router-dom', () => {
  const mocked = {
    Prompt: (props: object) => MockPrompt(props),
  };
  return { ...mocked, default: mocked };
});

import { render } from '@testing-library/react';
import { vi } from 'vitest';
import type { MockInstance } from 'vitest';

import { UnsavedChangesPrompt } from './unsaved_changes_prompt';

describe('UnsavedChangesPrompt', () => {
  let addEventListenerSpy: MockInstance;
  let removeEventListenerSpy: MockInstance;

  beforeAll(() => {
    addEventListenerSpy = vi.spyOn(window, 'addEventListener').mockImplementation(() => true);
    removeEventListenerSpy = vi.spyOn(window, 'removeEventListener').mockImplementation(() => true);
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterAll(() => {
    addEventListenerSpy.mockRestore();
    removeEventListenerSpy.mockRestore();
  });

  it('renders a React Router Prompt, which will show users a confirmation message when navigating within the SPA if hasUnsavedChanges is true', () => {
    render(<UnsavedChangesPrompt hasUnsavedChanges />);

    expect(MockPrompt).toHaveBeenCalledWith(
      expect.objectContaining({
        when: true,
        message: 'Your changes have not been saved. Are you sure you want to leave?',
      })
    );
  });

  it('the message text of the prompt can be customized', () => {
    render(<UnsavedChangesPrompt hasUnsavedChanges messageText="Some custom text" />);

    expect(MockPrompt).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Some custom text' })
    );
  });

  describe('external navigation', () => {
    const getAddBeforeUnloadCalls = () =>
      addEventListenerSpy.mock.calls.filter((call) => call[0] === 'beforeunload');
    const getRemoveBeforeUnloadCalls = () =>
      removeEventListenerSpy.mock.calls.filter((call) => call[0] === 'beforeunload');
    const getLastHandler = () => {
      const calls = getAddBeforeUnloadCalls();
      return calls[calls.length - 1][1];
    };

    it('sets up a handler for the beforeunload event', () => {
      render(<UnsavedChangesPrompt hasUnsavedChanges />);

      expect(getAddBeforeUnloadCalls().length).toBe(1);
    });

    it('that handler will show users a confirmation message when navigating outside the SPA if hasUnsavedChanges is true', () => {
      render(<UnsavedChangesPrompt hasUnsavedChanges />);

      const event = { returnValue: null, preventDefault: vi.fn() };
      getLastHandler()(event);

      expect(event.returnValue).toEqual('');
      expect(event.preventDefault).toHaveBeenCalled();
    });

    it('will not register a new handler if there is a re-render and hasUnsavedChanges is still true', () => {
      const { rerender } = render(<UnsavedChangesPrompt hasUnsavedChanges />);
      rerender(<UnsavedChangesPrompt hasUnsavedChanges messageText="custom message text" />);

      expect(getAddBeforeUnloadCalls().length).toBe(1);
    });

    it('when the hasUnsavedChanges prop changes to false, it will deregister the old handler and create a new one, which will not show users a confirmation', () => {
      const { rerender } = render(<UnsavedChangesPrompt hasUnsavedChanges />);
      const initialHandler = getLastHandler();

      rerender(<UnsavedChangesPrompt hasUnsavedChanges={false} />);

      const unregisterCalls = getRemoveBeforeUnloadCalls();
      expect(unregisterCalls.length).toBe(1);
      expect(unregisterCalls[0][1]).toBe(initialHandler);

      expect(getAddBeforeUnloadCalls().length).toBe(2);
      const newHandler = getLastHandler();

      const event = { returnValue: null, preventDefault: vi.fn() };
      newHandler(event);
      expect(event.returnValue).toEqual(null);
      expect(event.preventDefault).not.toHaveBeenCalled();
    });
  });
});
