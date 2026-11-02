/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { EntityFiltersBarWatchlist } from './entity_filters_bar_watchlist';

const mockOpenFlyout = jest.fn();
const mockUseWatchlistsPrivileges = jest.fn();

jest.mock('@kbn/expandable-flyout', () => ({
  useExpandableFlyoutApi: () => ({ openFlyout: mockOpenFlyout }),
}));

jest.mock('../../api/hooks/use_watchlists_privileges', () => ({
  useWatchlistsPrivileges: () => mockUseWatchlistsPrivileges(),
}));

const renderComponent = () =>
  render(
    <I18nProvider>
      <EntityFiltersBarWatchlist
        title="Watchlist"
        items={['watchlist-a']}
        selectedItems={[]}
        onSelectionChange={jest.fn()}
        renderItem={(id) => <span>{id}</span>}
        spaceId="default"
      />
    </I18nProvider>
  );

const openPopover = () =>
  fireEvent.click(screen.getByTestId('entityFiltersBarWatchlist-popoverButton'));

describe('EntityFiltersBarWatchlist', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseWatchlistsPrivileges.mockReturnValue({
      data: { has_all_required: true },
      error: null,
      isLoading: false,
    });
  });

  it('renders the create button with a plus-in-circle icon', () => {
    renderComponent();
    openPopover();

    const button = screen.getByTestId('entityFiltersBarCreateWatchlist');
    expect(button.querySelector('[data-euiicon-type="plusCircle"]')).toBeInTheDocument();
  });

  it('renders the create button without a solid fill', () => {
    renderComponent();
    openPopover();

    expect(screen.getByTestId('entityFiltersBarCreateWatchlist').className).not.toMatch(/fill/i);
  });

  it('separates the create button from the list with a divider', () => {
    renderComponent();
    openPopover();

    expect(screen.getByRole('separator')).toBeInTheDocument();
  });

  it('opens the create flyout and closes the popover when clicked', () => {
    renderComponent();
    openPopover();

    fireEvent.click(screen.getByTestId('entityFiltersBarCreateWatchlist'));

    expect(mockOpenFlyout).toHaveBeenCalledWith({
      right: { id: expect.any(String), params: { mode: 'create', spaceId: 'default' } },
    });
  });
});
