/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { SynonymSets } from './synonym_sets';

describe('Search Synonym Sets list', () => {
  const synonymsMock = {
    _meta: {
      pageIndex: 0,
      pageSize: 10,
      totalItemCount: 2,
    },
    data: [
      {
        synonyms_set: 'Synonyms Set 1',
        count: 2,
      },
      {
        synonyms_set: 'Synonyms Set 2',
        count: 3,
      },
    ],
  };
  it('should render the list with synonym sets', () => {
    render(<SynonymSets synonyms={synonymsMock} />);
    const synonymSetTable = screen.getByTestId('synonyms-set-table');
    expect(synonymSetTable).toBeInTheDocument();

    const synonymSetItemNames = screen.getAllByTestId('synonyms-set-item-name');
    expect(synonymSetItemNames).toHaveLength(2);
    expect(synonymSetItemNames[0].textContent).toBe('Synonyms Set 1');
    expect(synonymSetItemNames[1].textContent).toBe('Synonyms Set 2');

    const synonymSetItemRuleCounts = screen.getAllByTestId('synonyms-set-item-rule-count');
    expect(synonymSetItemRuleCounts).toHaveLength(2);
    expect(synonymSetItemRuleCounts[0].textContent).toBe('2');
    expect(synonymSetItemRuleCounts[1].textContent).toBe('3');

    const synonymSetItemActions = screen.getAllByTestId('synonyms-set-item-actions');
    expect(synonymSetItemActions).toHaveLength(2);

    const synonymSetItemPageSize = screen.getByTestId('tablePaginationPopoverButton');
    const synonymSetPageButton = screen.getByTestId('pagination-button-0');
    expect(synonymSetItemPageSize).toBeInTheDocument();
    expect(synonymSetPageButton).toBeInTheDocument();
  });

  describe('Synonym set item', () => {
    it('should have an action popover', async () => {
      render(<SynonymSets synonyms={synonymsMock} />);
      const synonymSetItemActions = screen.getAllByTestId('synonyms-set-item-actions');
      act(() => {
        fireEvent.click(synonymSetItemActions[0]);
      });
      const synonymSetItemActionPopover = screen.getAllByTestId(
        'synonyms-set-item-action-popover-panel'
      )[0];
      await waitFor(() => expect(synonymSetItemActionPopover).toBeVisible());
    });
  });
});
