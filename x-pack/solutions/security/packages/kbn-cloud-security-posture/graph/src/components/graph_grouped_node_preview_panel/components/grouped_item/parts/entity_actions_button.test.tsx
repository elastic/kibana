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
import { GROUPED_ITEM_ACTIONS_BUTTON_TEST_ID } from '../../../test_ids';
import { createFilterStore, destroyFilterStore } from '../../../../filters/filter_store';

// Mock useExpandableFlyoutApi
const mockOpenPreviewPanel = jest.fn();
jest.mock('@kbn/expandable-flyout', () => ({
  useExpandableFlyoutApi: jest.fn(() => ({
    openPreviewPanel: mockOpenPreviewPanel,
  })),
}));

describe('EntityActionsButton', () => {
  const mockEntityItem: EntityItem = {
    id: 'entity-123',
    itemType: 'entity',
    icon: 'user',
    label: 'Test Entity',
    availableInEntityStore: true,
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
    render(<EntityActionsButton item={mockEntityItem} scopeId={scopeId} />);

    expect(screen.getByTestId(GROUPED_ITEM_ACTIONS_BUTTON_TEST_ID)).toBeInTheDocument();
  });

  it('should have correct aria-label', () => {
    render(<EntityActionsButton item={mockEntityItem} scopeId={scopeId} />);

    const button = screen.getByTestId(GROUPED_ITEM_ACTIONS_BUTTON_TEST_ID);
    expect(button).toHaveAttribute('aria-label', 'Actions');
  });

  describe('when popover is open', () => {
    it('should render entity details item with correct label', () => {
      render(<EntityActionsButton item={mockEntityItem} scopeId={scopeId} />);

      // Click the button to open the popover
      fireEvent.click(screen.getByTestId(GROUPED_ITEM_ACTIONS_BUTTON_TEST_ID));

      // The popover should show entity details option
      expect(screen.getByText('Show entity details')).toBeInTheDocument();
    });

    it('should open preview panel when entity details is clicked', () => {
      render(<EntityActionsButton item={mockEntityItem} scopeId={scopeId} />);

      // Click the button to open the popover
      fireEvent.click(screen.getByTestId(GROUPED_ITEM_ACTIONS_BUTTON_TEST_ID));

      const entityDetailsButton = screen.getByText('Show entity details');
      fireEvent.click(entityDetailsButton);

      expect(mockOpenPreviewPanel).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({
            entityId: mockEntityItem.id,
            scopeId,
          }),
        })
      );
    });
  });
});
