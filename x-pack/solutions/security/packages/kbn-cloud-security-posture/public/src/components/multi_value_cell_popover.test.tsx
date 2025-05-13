/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act } from 'react-dom/test-utils';
import { render, fireEvent, screen } from '@testing-library/react';
import { MultiValueCellPopover } from './multi_value_cell_popover';
import { EuiBadge, EuiText } from '@elastic/eui';
import { MULTI_VALUE_CELL_FIRST_ITEM_VALUE, MULTI_VALUE_CELL_MORE_BUTTON } from '../constants';

const RENDER_ITEM_TEST_ID = 'item-renderer-test-id';

// Mock EUI theme hook
jest.mock('@elastic/eui', () => ({
  ...jest.requireActual('@elastic/eui'),
  useEuiTheme: () => ({ euiTheme: { size: { s: '8px' } } }),
}));

describe('MultiValueCellPopover', () => {
  const mockObject = { id: '1' };
  const defaultRenderItem = (item: string) => (
    <EuiBadge data-test-subj={RENDER_ITEM_TEST_ID}>{item}</EuiBadge>
  );

  it('renders single item without badge', () => {
    render(
      <MultiValueCellPopover
        items={['item1']}
        field="test"
        object={mockObject}
        renderItem={defaultRenderItem}
      />
    );

    expect(screen.getByTestId(MULTI_VALUE_CELL_FIRST_ITEM_VALUE)).toBeInTheDocument();
    expect(screen.getByTestId(MULTI_VALUE_CELL_FIRST_ITEM_VALUE)).toHaveTextContent('item1');
    expect(screen.queryByTestId(MULTI_VALUE_CELL_MORE_BUTTON)).not.toBeInTheDocument();
  });

  it('renders multiple items with badge', () => {
    render(
      <MultiValueCellPopover
        items={['item1', 'item2', 'item3']}
        field="test"
        object={mockObject}
        renderItem={defaultRenderItem}
      />
    );

    expect(screen.getByTestId(MULTI_VALUE_CELL_FIRST_ITEM_VALUE)).toBeInTheDocument();
    expect(screen.getByTestId(MULTI_VALUE_CELL_FIRST_ITEM_VALUE)).toHaveTextContent('item1');
    expect(screen.getByTestId(MULTI_VALUE_CELL_MORE_BUTTON)).toBeInTheDocument();
    expect(screen.getByTestId(MULTI_VALUE_CELL_MORE_BUTTON)).toHaveTextContent('+ 2');
  });

  it('opens popover on badge click', async () => {
    render(
      <MultiValueCellPopover
        items={['item1', 'item2']}
        field="test"
        object={mockObject}
        renderItem={defaultRenderItem}
      />
    );

    const badge = screen.getByText('+ 1');
    act(() => {
      fireEvent.click(badge);
    });

    expect(screen.getAllByTestId(RENDER_ITEM_TEST_ID)).toHaveLength(2);
  });

  it('uses custom firstItemRenderer when provided', () => {
    const customRenderTestId = 'custom-renderer-test-id';

    const customRenderer = (item: string) => (
      <EuiText data-test-subj={customRenderTestId}>{`Custom ${item}`}</EuiText>
    );

    render(
      <MultiValueCellPopover
        items={['item1']}
        field="test"
        object={mockObject}
        renderItem={defaultRenderItem}
        firstItemRenderer={customRenderer}
      />
    );

    expect(screen.getByTestId(customRenderTestId)).toBeInTheDocument();
    expect(screen.getByTestId(customRenderTestId)).toHaveTextContent('Custom item1');
  });
});
