/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderWithI18n } from '@kbn/test-jest-helpers';
import { I18nProvider } from '@kbn/i18n-react';
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
        items={makeItems(5)}
        isLoading={false}
        renderCard={renderCard}
      />
    );
    const count = screen.getByTestId('addDataSearchResultsCount');
    expect(count).toHaveTextContent('Showing 5 integrations');
    expect(count.querySelector('strong')).toHaveTextContent('5 integrations');
    expect(count.querySelector('strong')).not.toHaveTextContent('Showing');
  });

  it('names the results section after the count header', () => {
    renderWithI18n(
      <AddDataSearchResults
        searchTerm="redis"
        items={makeItems(5)}
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
        items={makeItems(5)}
        isLoading={false}
        renderCard={renderCard}
      />
    );
    expect(liveRegionTexts()).toContain('Showing 5 integrations');
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

  it('caps visible results at two rows and paginates the rest', () => {
    renderWithI18n(
      <AddDataSearchResults
        searchTerm="aws"
        items={makeItems(30)}
        isLoading={false}
        renderCard={renderCard}
      />
    );
    expect(screen.getAllByTestId(/^card-item-/)).toHaveLength(6);
    expect(screen.getByTestId('card-item-0')).toBeInTheDocument();
    expect(screen.queryByTestId('card-item-6')).not.toBeInTheDocument();
    expect(screen.getByTestId('addDataSearchResultsPagination')).toBeInTheDocument();
  });

  it('reports the visible range and the total when results exceed two rows', () => {
    renderWithI18n(
      <AddDataSearchResults
        searchTerm="aws"
        items={makeItems(8)}
        isLoading={false}
        renderCard={renderCard}
      />
    );
    const count = screen.getByTestId('addDataSearchResultsCount');
    expect(count).toHaveTextContent('Showing 1-6 of 8 integrations');
    expect(count.querySelector('strong')).toHaveTextContent('1-6 of 8 integrations');
    expect(count.querySelector('strong')).not.toHaveTextContent('Showing');
    expect(liveRegionTexts()).toContain('Showing 1-6 of 8 integrations');
  });

  it('shows the next slice when the second page is selected', async () => {
    const user = userEvent.setup();
    renderWithI18n(
      <AddDataSearchResults
        searchTerm="aws"
        items={makeItems(8)}
        isLoading={false}
        renderCard={renderCard}
      />
    );
    await user.click(screen.getByTestId('pagination-button-1'));
    expect(screen.getAllByTestId(/^card-item-/)).toHaveLength(2);
    expect(screen.getByTestId('card-item-6')).toBeInTheDocument();
    expect(screen.queryByTestId('card-item-0')).not.toBeInTheDocument();
    expect(screen.getByTestId('addDataSearchResultsCount')).toHaveTextContent(
      'Showing 7-8 of 8 integrations'
    );
  });

  it('does not write to the url when the page changes', async () => {
    const user = userEvent.setup();
    const hrefBefore = window.location.href;
    renderWithI18n(
      <AddDataSearchResults
        searchTerm="aws"
        items={makeItems(8)}
        isLoading={false}
        renderCard={renderCard}
      />
    );
    await user.click(screen.getByTestId('pagination-button-1'));
    expect(window.location.href).toBe(hrefBefore);
  });

  it('hides pagination when the match count fits in two rows', () => {
    renderWithI18n(
      <AddDataSearchResults
        searchTerm="redis"
        items={makeItems(6)}
        isLoading={false}
        renderCard={renderCard}
      />
    );
    expect(screen.getAllByTestId(/^card-item-/)).toHaveLength(6);
    expect(screen.queryByTestId('addDataSearchResultsPagination')).not.toBeInTheDocument();
    expect(screen.getByTestId('addDataSearchResultsCount')).toHaveTextContent(
      'Showing 6 integrations'
    );
  });

  it('returns to the first page when the search term changes', async () => {
    const user = userEvent.setup();
    const view = renderWithI18n(
      <AddDataSearchResults
        searchTerm="aws"
        items={makeItems(12)}
        isLoading={false}
        renderCard={renderCard}
      />
    );
    await user.click(screen.getByTestId('pagination-button-1'));
    expect(screen.getByTestId('card-item-6')).toBeInTheDocument();

    view.rerender(
      <I18nProvider>
        <AddDataSearchResults
          searchTerm="azure"
          items={makeItems(12, 'azure')}
          isLoading={false}
          renderCard={renderCard}
        />
      </I18nProvider>
    );

    expect(screen.getByTestId('card-azure-0')).toBeInTheDocument();
    expect(screen.queryByTestId('card-azure-6')).not.toBeInTheDocument();
    expect(screen.getByTestId('addDataSearchResultsCount')).toHaveTextContent(
      'Showing 1-6 of 12 integrations'
    );
  });

  it('returns to the first page when a new term has fewer pages', async () => {
    const user = userEvent.setup();
    const view = renderWithI18n(
      <AddDataSearchResults
        searchTerm="aws"
        items={makeItems(30)}
        isLoading={false}
        renderCard={renderCard}
      />
    );
    await user.click(screen.getByTestId('pagination-button-2'));

    view.rerender(
      <I18nProvider>
        <AddDataSearchResults
          searchTerm="azure"
          items={makeItems(8, 'azure')}
          isLoading={false}
          renderCard={renderCard}
        />
      </I18nProvider>
    );

    expect(screen.getByTestId('card-azure-0')).toBeInTheDocument();
    expect(screen.getByTestId('addDataSearchResultsCount')).toHaveTextContent(
      'Showing 1-6 of 8 integrations'
    );
  });

  it('clamps to the last page when the list shrinks under the same term', async () => {
    const user = userEvent.setup();
    const view = renderWithI18n(
      <AddDataSearchResults
        searchTerm="aws"
        items={makeItems(8)}
        isLoading={false}
        renderCard={renderCard}
      />
    );
    await user.click(screen.getByTestId('pagination-button-1'));
    expect(screen.getByTestId('card-item-6')).toBeInTheDocument();

    view.rerender(
      <I18nProvider>
        <AddDataSearchResults
          searchTerm="aws"
          items={makeItems(3)}
          isLoading={false}
          renderCard={renderCard}
        />
      </I18nProvider>
    );

    expect(screen.getAllByTestId(/^card-item-/)).toHaveLength(3);
    expect(screen.getByTestId('card-item-0')).toBeInTheDocument();
    expect(screen.queryByTestId('card-item-6')).not.toBeInTheDocument();
    expect(screen.getByTestId('addDataSearchResultsCount')).toHaveTextContent(
      'Showing 3 integrations'
    );
    expect(screen.queryByTestId('addDataSearchResultsPagination')).not.toBeInTheDocument();
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
    expect(screen.queryByTestId('addDataSearchResultsPagination')).not.toBeInTheDocument();
    expect(screen.queryByTestId('addDataSearchResultsCount')).not.toBeInTheDocument();
  });
});
