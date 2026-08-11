/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderWithI18n } from '@kbn/test-jest-helpers';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { AddDataSearchResults } from './search_results';

interface TestItem {
  id: string;
  label: string;
}

const makeItems = (count: number, prefix = 'item'): TestItem[] =>
  Array.from({ length: count }, (_, index) => ({
    id: `${prefix}-${index}`,
    label: `Item ${index}`,
  }));

const renderCard = (item: TestItem) => <div data-test-subj={`card-${item.id}`}>{item.label}</div>;

const liveRegionTexts = () => screen.getAllByRole('status').map((region) => region.textContent);

describe('AddDataSearchResults', () => {
  it('shows the total match count in the header, count and noun emphasized', () => {
    renderWithI18n(
      <AddDataSearchResults
        searchTerm="redis"
        items={makeItems(8)}
        isLoading={false}
        renderCard={renderCard}
      />
    );
    const count = screen.getByTestId('addDataSearchResultsCount');
    expect(count).toHaveTextContent('Showing 8 integrations');
    // Design: "Showing" stays regular weight, only the count and noun are bold.
    expect(count.querySelector('strong')).toHaveTextContent('8 integrations');
    expect(count.querySelector('strong')).not.toHaveTextContent('Showing');
  });

  it('names the results section after the count header', () => {
    renderWithI18n(
      <AddDataSearchResults
        searchTerm="redis"
        items={makeItems(8)}
        isLoading={false}
        renderCard={renderCard}
      />
    );
    const section = screen.getByTestId('addDataSearchResults');
    expect(section).toHaveAttribute(
      'aria-labelledby',
      screen.getByTestId('addDataSearchResultsCount').id
    );
  });

  it('announces the result count in a live region', () => {
    renderWithI18n(
      <AddDataSearchResults
        searchTerm="redis"
        items={makeItems(8)}
        isLoading={false}
        renderCard={renderCard}
      />
    );
    expect(liveRegionTexts()).toContain('Showing 8 integrations');
  });

  it('announces the empty state in a live region', () => {
    renderWithI18n(
      <AddDataSearchResults
        searchTerm="zzz-no-match"
        items={[]}
        isLoading={false}
        renderCard={renderCard}
      />
    );
    expect(liveRegionTexts()).toContain('No results for zzz-no-match');
  });

  it('renders every item with no pagination control', () => {
    renderWithI18n(
      <AddDataSearchResults
        searchTerm="redis"
        items={makeItems(30)}
        isLoading={false}
        renderCard={renderCard}
      />
    );
    expect(screen.getAllByTestId(/^card-item-/)).toHaveLength(30);
    expect(screen.queryByTestId('addDataSearchResultsShowMore')).not.toBeInTheDocument();
  });

  it('renders a loading skeleton', () => {
    renderWithI18n(
      <AddDataSearchResults
        searchTerm="redis"
        items={[]}
        isLoading={true}
        renderCard={renderCard}
      />
    );
    expect(screen.getByTestId('addDataSearchResultsLoading')).toBeInTheDocument();
  });

  it('renders the error state and calls onRetry', async () => {
    const user = userEvent.setup();
    const onRetry = jest.fn();
    renderWithI18n(
      <AddDataSearchResults
        searchTerm="redis"
        items={[]}
        isLoading={false}
        isError
        onRetry={onRetry}
        renderCard={renderCard}
      />
    );
    await user.click(screen.getByTestId('addDataSearchResultsRetryButton'));
    expect(onRetry).toHaveBeenCalled();
  });

  it('renders an empty state including the search term', () => {
    renderWithI18n(
      <AddDataSearchResults
        searchTerm="zzz-no-match"
        items={[]}
        isLoading={false}
        renderCard={renderCard}
      />
    );
    expect(screen.getByTestId('addDataSearchResultsEmpty')).toHaveTextContent('zzz-no-match');
  });
});
