/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { EntityActionsButton } from './entity_actions_button';
import type { EntityItem } from '../types';
import { filterState$, dataViewId$ } from '../../../../graph_investigation/filter_state';
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
        {items.map((item: { testSubject: string; label: string; onClick: () => void }) => (
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

describe('EntityActionsButton', () => {
  const mockEntityItem: EntityItem = {
    id: 'entity-123',
    itemType: 'entity',
    icon: 'user',
    label: 'Test Entity',
    availableInEntityStore: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset BehaviorSubjects
    filterState$.next([]);
    dataViewId$.next('test-data-view');
  });

  it('should render the actions button', () => {
    render(<EntityActionsButton item={mockEntityItem} />);

    expect(screen.getByTestId(GROUPED_ITEM_ACTIONS_BUTTON_TEST_ID)).toBeInTheDocument();
  });

  it('should have correct aria-label', () => {
    render(<EntityActionsButton item={mockEntityItem} />);

    const button = screen.getByTestId(GROUPED_ITEM_ACTIONS_BUTTON_TEST_ID);
    expect(button).toHaveAttribute('aria-label', 'Actions');
  });

  describe('when popover is open', () => {
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

    it('should render entity details item with correct label', () => {
      render(<EntityActionsButton item={mockEntityItem} />);

      // The popover should show entity details option
      expect(screen.getByText('Show entity details')).toBeInTheDocument();
    });

    it('should emit emitGroupedItemClick when entity details is clicked', () => {
      const emitSpy = jest.spyOn(eventsModule, 'emitGroupedItemClick');

      render(<EntityActionsButton item={mockEntityItem} />);

      const entityDetailsButton = screen.getByText('Show entity details');
      fireEvent.click(entityDetailsButton);

      expect(emitSpy).toHaveBeenCalledWith(mockEntityItem);
    });
  });
});
