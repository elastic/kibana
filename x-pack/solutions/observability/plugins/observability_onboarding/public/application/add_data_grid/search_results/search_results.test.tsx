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
import React, { useEffect } from 'react';
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
  it('shows the total match count in the header', () => {
    renderWithI18n(
      <AddDataSearchResults
        searchTerm="redis"
        items={makeItems(8)}
        isLoading={false}
        renderCard={renderCard}
      />
    );
    expect(screen.getByTestId('addDataSearchResultsCount')).toHaveTextContent('Showing 8 results');
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
    expect(liveRegionTexts()).toContain('Showing 8 results');
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

  it('renders only the first page and reveals more on Show more', async () => {
    const user = userEvent.setup();
    renderWithI18n(
      <AddDataSearchResults
        searchTerm="redis"
        items={makeItems(8)}
        isLoading={false}
        renderCard={renderCard}
        pageSize={6}
      />
    );
    expect(screen.getAllByTestId(/^card-item-/)).toHaveLength(6);
    await user.click(screen.getByTestId('addDataSearchResultsShowMore'));
    expect(screen.getAllByTestId(/^card-item-/)).toHaveLength(8);
    expect(screen.queryByTestId('addDataSearchResultsShowMore')).not.toBeInTheDocument();
  });

  it('moves focus onto the first revealed card when Show more unmounts the button', async () => {
    const user = userEvent.setup();
    renderWithI18n(
      <AddDataSearchResults
        searchTerm="redis"
        items={makeItems(8)}
        isLoading={false}
        renderCard={renderCard}
        pageSize={6}
      />
    );
    await user.click(screen.getByTestId('addDataSearchResultsShowMore'));
    expect(screen.getByTestId('card-item-6').closest('[tabindex="-1"]')).toHaveFocus();
  });

  it('resets pagination when the search term changes', async () => {
    const user = userEvent.setup();
    const { rerender } = renderWithI18n(
      <AddDataSearchResults
        searchTerm="redis"
        items={makeItems(14)}
        isLoading={false}
        renderCard={renderCard}
        pageSize={6}
      />
    );
    await user.click(screen.getByTestId('addDataSearchResultsShowMore'));
    expect(screen.getAllByTestId(/^card-item-/)).toHaveLength(12);
    rerender(
      <I18nProvider>
        <AddDataSearchResults
          searchTerm="nginx"
          items={makeItems(14)}
          isLoading={false}
          renderCard={renderCard}
          pageSize={6}
        />
      </I18nProvider>
    );
    expect(screen.getAllByTestId(/^card-item-/)).toHaveLength(6);
  });

  it('never mounts the expanded page of cards under the new search term', async () => {
    const user = userEvent.setup();
    const mounted: string[] = [];
    const TrackedCard = ({ id }: { id: string }) => {
      useEffect(() => {
        mounted.push(id);
      }, [id]);
      return <div data-test-subj={`card-${id}`} />;
    };
    const renderTrackedCard = (item: TestItem) => <TrackedCard id={item.id} />;

    const { rerender } = renderWithI18n(
      <AddDataSearchResults
        searchTerm="redis"
        items={makeItems(14, 'redis')}
        isLoading={false}
        renderCard={renderTrackedCard}
        pageSize={6}
      />
    );
    await user.click(screen.getByTestId('addDataSearchResultsShowMore'));
    expect(screen.getAllByTestId(/^card-redis-/)).toHaveLength(12);

    mounted.length = 0;
    rerender(
      <I18nProvider>
        <AddDataSearchResults
          searchTerm="nginx"
          items={makeItems(14, 'nginx')}
          isLoading={false}
          renderCard={renderTrackedCard}
          pageSize={6}
        />
      </I18nProvider>
    );

    // Resetting in an effect would let all 12 mount for one commit first, which
    // host cards can report as usage-tracking impressions.
    expect(mounted).toEqual(['nginx-0', 'nginx-1', 'nginx-2', 'nginx-3', 'nginx-4', 'nginx-5']);
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
