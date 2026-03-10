/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook, render, screen } from '@testing-library/react';
import { TestProviders } from '../../mock/test_providers';
import { useNodeDetailsPopover } from './use_node_details_popover';
import type { GenericPopoverItem } from './use_node_details_popover';

const mockOpenPopover = jest.fn();
const mockClosePopover = jest.fn();

const mockUseGraphPopoverState = jest.fn(() => ({
  id: 'test-popover-id',
  state: {
    isOpen: false,
    anchorElement: null,
  },
  actions: {
    openPopover: mockOpenPopover,
    closePopover: mockClosePopover,
  },
}));

jest.mock('../primitives/use_graph_popover_state', () => ({
  useGraphPopoverState: () => mockUseGraphPopoverState(),
}));

const createTestItems = (count: number): GenericPopoverItem[] => {
  return Array.from({ length: count }, (_, index) => ({
    key: `item-${index}`,
    label: `Test Item ${index + 1}`,
  }));
};

const defaultProps = {
  popoverId: 'test-popover',
  contentTestSubj: 'test-content',
  itemTestSubj: 'test-item',
  popoverTestSubj: 'test-popover',
};

const mockOpenPopoverState = () => {
  (mockUseGraphPopoverState as jest.Mock).mockReturnValue({
    id: 'test-popover-id',
    state: {
      isOpen: true,
      anchorElement: document.createElement('button'),
    },
    actions: {
      openPopover: mockOpenPopover,
      closePopover: mockClosePopover,
    },
  });
};

const renderPopoverWithItems = (itemCount: number) => {
  mockOpenPopoverState();

  const items = createTestItems(itemCount);
  const { result } = renderHook(() => useNodeDetailsPopover({ ...defaultProps, items }), {
    wrapper: TestProviders,
  });

  const PopoverComponent = result.current.PopoverComponent;
  render(<PopoverComponent />, { wrapper: TestProviders });

  return { items, result };
};

const expectPopoverContentToRender = (items: GenericPopoverItem[], expectedCount: number) => {
  items.forEach((item) => {
    expect(screen.getByText(item.label as string)).toBeInTheDocument();
  });

  expect(screen.getAllByTestId(defaultProps.itemTestSubj)).toHaveLength(expectedCount);
};

describe('useNodeDetailsPopover', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockUseGraphPopoverState.mockReturnValue({
      id: 'test-popover-id',
      state: {
        isOpen: false,
        anchorElement: null,
      },
      actions: {
        openPopover: mockOpenPopover,
        closePopover: mockClosePopover,
      },
    });
  });

  it('should call openPopover when onClick is triggered', () => {
    const items = createTestItems(5);
    const { result } = renderHook(() => useNodeDetailsPopover({ ...defaultProps, items }), {
      wrapper: TestProviders,
    });

    const mockButton = document.createElement('button');
    const mockEvent = {
      currentTarget: mockButton,
    } as React.MouseEvent<HTMLButtonElement>;

    result.current.onClick(mockEvent);

    expect(mockOpenPopover).toHaveBeenCalledWith(mockButton);
  });

  it('should render popover content with 5 items (less than 10)', () => {
    const { items } = renderPopoverWithItems(5);
    expectPopoverContentToRender(items, 5);
  });

  it('should render popover content with exactly 10 items', () => {
    const { items } = renderPopoverWithItems(10);
    expectPopoverContentToRender(items, 10);
  });

  it('should render popover content with 20 items (more than 10)', () => {
    const { items } = renderPopoverWithItems(20);
    expectPopoverContentToRender(items, 20);
  });
});
