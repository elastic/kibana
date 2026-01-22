/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { EventActionsButton } from './event_actions_button';
import type { EventItem, AlertItem } from '../types';
import { GROUPED_ITEM_ACTIONS_BUTTON_TEST_ID } from '../../../test_ids';
import { createFilterStore, destroyFilterStore } from '../../../../filters/filter_store';

// Mock useExpandableFlyoutApi
const mockOpenPreviewPanel = jest.fn();
jest.mock('@kbn/expandable-flyout', () => ({
  useExpandableFlyoutApi: jest.fn(() => ({
    openPreviewPanel: mockOpenPreviewPanel,
  })),
}));

describe('EventActionsButton', () => {
  const mockEventItem: EventItem = {
    id: 'event-123',
    itemType: 'event',
    action: 'file_created',
    docId: 'event-doc-123',
    timestamp: '2025-01-19T00:00:00.000Z',
  };

  const mockAlertItem: AlertItem = {
    id: 'alert-123',
    itemType: 'alert',
    action: 'malware_detected',
    docId: 'alert-doc-123',
    timestamp: '2025-01-19T00:00:00.000Z',
  };

  // Use unique scopeId per test run to prevent cross-test pollution
  let scopeId: string;

  beforeEach(() => {
    jest.clearAllMocks();
    // Generate unique scopeId for each test
    scopeId = `test-scope-${Math.random().toString(36).substring(7)}`;
    // Create a filter store for the test scope
    createFilterStore(scopeId, 'test-data-view-id');
  });

  afterEach(() => {
    // Clean up the filter store
    destroyFilterStore(scopeId);
  });

  it('should render the actions button', () => {
    render(<EventActionsButton item={mockEventItem} scopeId={scopeId} />);

    expect(screen.getByTestId(GROUPED_ITEM_ACTIONS_BUTTON_TEST_ID)).toBeInTheDocument();
  });

  it('should have correct aria-label', () => {
    render(<EventActionsButton item={mockEventItem} scopeId={scopeId} />);

    const button = screen.getByTestId(GROUPED_ITEM_ACTIONS_BUTTON_TEST_ID);
    expect(button).toHaveAttribute('aria-label', 'Actions');
  });

  describe('when popover is open with event item', () => {
    it('should render event details item with correct label for events', () => {
      render(<EventActionsButton item={mockEventItem} scopeId={scopeId} />);

      // Click the button to open the popover
      fireEvent.click(screen.getByTestId(GROUPED_ITEM_ACTIONS_BUTTON_TEST_ID));

      expect(screen.getByText('Show event details')).toBeInTheDocument();
    });

    it('should render show related events item', () => {
      render(<EventActionsButton item={mockEventItem} scopeId={scopeId} />);

      // Click the button to open the popover
      fireEvent.click(screen.getByTestId(GROUPED_ITEM_ACTIONS_BUTTON_TEST_ID));

      expect(screen.getByText('Show related events')).toBeInTheDocument();
    });

    it('should open preview panel when event details is clicked', () => {
      render(<EventActionsButton item={mockEventItem} scopeId={scopeId} />);

      // Click the button to open the popover
      fireEvent.click(screen.getByTestId(GROUPED_ITEM_ACTIONS_BUTTON_TEST_ID));

      const eventDetailsButton = screen.getByText('Show event details');
      fireEvent.click(eventDetailsButton);

      expect(mockOpenPreviewPanel).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({
            id: mockEventItem.docId,
          }),
        })
      );
    });
  });

  describe('when popover is open with alert item', () => {
    it('should render alert details item with correct label for alerts', () => {
      render(<EventActionsButton item={mockAlertItem} scopeId={scopeId} />);

      // Click the button to open the popover
      fireEvent.click(screen.getByTestId(GROUPED_ITEM_ACTIONS_BUTTON_TEST_ID));

      expect(screen.getByText('Show alert details')).toBeInTheDocument();
    });

    it('should open preview panel when alert details is clicked', () => {
      render(<EventActionsButton item={mockAlertItem} scopeId={scopeId} />);

      // Click the button to open the popover
      fireEvent.click(screen.getByTestId(GROUPED_ITEM_ACTIONS_BUTTON_TEST_ID));

      const alertDetailsButton = screen.getByText('Show alert details');
      fireEvent.click(alertDetailsButton);

      expect(mockOpenPreviewPanel).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({
            id: mockAlertItem.docId,
          }),
        })
      );
    });
  });
});
