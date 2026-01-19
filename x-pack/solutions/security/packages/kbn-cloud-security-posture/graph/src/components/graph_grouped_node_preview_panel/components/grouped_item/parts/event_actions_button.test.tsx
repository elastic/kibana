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
import { filterState$, dataViewId$ } from '../../../../graph_investigation/filter_state';
import * as filterActionsModule from '../../../../graph_investigation/filter_actions';
import * as eventsModule from '../../../events';
import { GROUPED_ITEM_ACTIONS_BUTTON_TEST_ID } from '../../../test_ids';
import { useGraphPopoverState } from '../../../../popovers/primitives/use_graph_popover_state';

// Mock useGraphPopoverState
jest.mock('../../../../popovers/primitives/use_graph_popover_state', () => ({
  useGraphPopoverState: jest.fn(() => ({
    state: { isOpen: false, anchorElement: null },
    actions: {
      openPopover: jest.fn(),
      closePopover: jest.fn(),
    },
  })),
}));

// Mock ListGraphPopover
jest.mock('../../../../popovers/primitives/list_graph_popover', () => ({
  ListGraphPopover: jest.fn(({ items, isOpen }) =>
    isOpen ? (
      <div data-test-subj="mock-popover">
        {items
          .filter((item: { type: string }) => item.type === 'item')
          .map((item: { testSubject: string; label: string; onClick: () => void }) => (
            <button
              type="button"
              key={item.testSubject}
              data-test-subj={item.testSubject}
              onClick={item.onClick}
            >
              {item.label}
            </button>
          ))}
      </div>
    ) : null
  ),
}));

const mockUseGraphPopoverState = useGraphPopoverState as jest.Mock;

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

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset BehaviorSubjects
    filterState$.next([]);
    dataViewId$.next('test-data-view');
  });

  it('should render the actions button', () => {
    render(<EventActionsButton item={mockEventItem} />);

    expect(screen.getByTestId(GROUPED_ITEM_ACTIONS_BUTTON_TEST_ID)).toBeInTheDocument();
  });

  it('should have correct aria-label', () => {
    render(<EventActionsButton item={mockEventItem} />);

    const button = screen.getByTestId(GROUPED_ITEM_ACTIONS_BUTTON_TEST_ID);
    expect(button).toHaveAttribute('aria-label', 'Actions');
  });

  describe('when popover is open with event item', () => {
    beforeEach(() => {
      // Mock popover as open
      mockUseGraphPopoverState.mockReturnValue({
        state: { isOpen: true, anchorElement: document.createElement('button') },
        actions: {
          openPopover: jest.fn(),
          closePopover: jest.fn(),
        },
      });
    });

    it('should render event details item with correct label for events', () => {
      render(<EventActionsButton item={mockEventItem} />);

      expect(screen.getByText('Show event details')).toBeInTheDocument();
    });

    it('should render show related events item', () => {
      render(<EventActionsButton item={mockEventItem} />);

      expect(screen.getByText('Show related events')).toBeInTheDocument();
    });

    it('should emit emitGroupedItemClick when event details is clicked', () => {
      const emitSpy = jest.spyOn(eventsModule, 'emitGroupedItemClick');

      render(<EventActionsButton item={mockEventItem} />);

      const eventDetailsButton = screen.getByText('Show event details');
      fireEvent.click(eventDetailsButton);

      expect(emitSpy).toHaveBeenCalledWith(mockEventItem);
    });

    it('should emit filter action when show related events is clicked', () => {
      const emitFilterSpy = jest.spyOn(filterActionsModule, 'emitFilterAction');

      render(<EventActionsButton item={mockEventItem} />);

      const relatedEventsButton = screen.getByText('Show related events');
      fireEvent.click(relatedEventsButton);

      expect(emitFilterSpy).toHaveBeenCalledWith({
        type: 'TOGGLE_EVENTS_WITH_ACTION',
        field: 'event.action',
        value: 'file_created',
        action: 'show',
      });
    });
  });

  describe('when popover is open with alert item', () => {
    beforeEach(() => {
      // Mock popover as open
      mockUseGraphPopoverState.mockReturnValue({
        state: { isOpen: true, anchorElement: document.createElement('button') },
        actions: {
          openPopover: jest.fn(),
          closePopover: jest.fn(),
        },
      });
    });

    it('should render alert details item with correct label for alerts', () => {
      render(<EventActionsButton item={mockAlertItem} />);

      expect(screen.getByText('Show alert details')).toBeInTheDocument();
    });

    it('should emit emitGroupedItemClick when alert details is clicked', () => {
      const emitSpy = jest.spyOn(eventsModule, 'emitGroupedItemClick');

      render(<EventActionsButton item={mockAlertItem} />);

      const alertDetailsButton = screen.getByText('Show alert details');
      fireEvent.click(alertDetailsButton);

      expect(emitSpy).toHaveBeenCalledWith(mockAlertItem);
    });
  });
});
