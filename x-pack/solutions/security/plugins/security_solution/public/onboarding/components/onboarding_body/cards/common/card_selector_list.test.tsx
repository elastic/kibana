/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { CardSelectorList } from './card_selector_list';
import type { CardSelectorListItem } from './card_selector_list';
import { RulesCardItemId } from '../rules/types';

const mockOnSelect = jest.fn();

const items: CardSelectorListItem[] = [
  {
    id: RulesCardItemId.install,
    title: 'Install Elastic rules',
    description: 'Quickly add and enable the rules you need with Elastic’s prebuilt rules',
  },
  {
    id: RulesCardItemId.create,
    title: 'Create a custom rule',
    description: 'Create a custom detection rule for local or remote data',
  },
];

const defaultProps = {
  items,
  onSelect: mockOnSelect,
  selectedItem: items[0],
  title: 'Select a Rule',
};

describe('CardSelectorList', () => {
  const scrollIntoViewMock = jest.fn();

  beforeAll(() => {
    Element.prototype.scrollIntoView = scrollIntoViewMock;
  });
  beforeEach(() => {
    jest.clearAllMocks();
  });
  afterAll(() => {
    jest.useRealTimers();
  });

  it('renders the component with the correct title', () => {
    const { getByText } = render(<CardSelectorList {...defaultProps} />);
    expect(getByText('Select a Rule')).toBeInTheDocument();
  });

  it('renders all card items', () => {
    const { getByTestId } = render(<CardSelectorList {...defaultProps} />);
    items.forEach((item) => {
      expect(getByTestId(`cardSelectorItem-${item.id}`)).toBeInTheDocument();
    });
  });

  it('applies the "selected" class to the selected item', () => {
    const { getByTestId } = render(<CardSelectorList {...defaultProps} />);
    const selectedItem = getByTestId(`cardSelectorItem-${RulesCardItemId.install}`);
    expect(selectedItem).toHaveClass('selectedCardPanelItem');
  });

  it('does not apply the "selected" class to unselected items', () => {
    const { getByTestId } = render(<CardSelectorList {...defaultProps} />);
    const unselectedItem = getByTestId(`cardSelectorItem-${RulesCardItemId.create}`);
    expect(unselectedItem).not.toHaveClass('selectedCardPanelItem');
  });

  it('calls onSelect with the correct item when an item is clicked', () => {
    const { getByTestId } = render(<CardSelectorList {...defaultProps} />);
    const unselectedItem = getByTestId(`cardSelectorItem-${RulesCardItemId.create}`);
    fireEvent.click(unselectedItem);
    expect(mockOnSelect).toHaveBeenCalledWith(items[1]);
  });

  it('scrolls to the selected item on initial render', () => {
    jest.useFakeTimers();
    render(<CardSelectorList {...defaultProps} />);
    jest.runAllTimers();
    expect(scrollIntoViewMock).toHaveBeenCalled();
  });

  it('updates the selected item visually when onSelect is called', () => {
    const { rerender, getByTestId } = render(<CardSelectorList {...defaultProps} />);
    rerender(<CardSelectorList {...defaultProps} selectedItem={items[1]} />);

    const newlySelectedItem = getByTestId(`cardSelectorItem-${RulesCardItemId.create}`);
    const previouslySelectedItem = getByTestId(`cardSelectorItem-${RulesCardItemId.install}`);

    expect(newlySelectedItem).toHaveClass('selectedCardPanelItem');
    expect(previouslySelectedItem).not.toHaveClass('selectedCardPanelItem');
  });
});
