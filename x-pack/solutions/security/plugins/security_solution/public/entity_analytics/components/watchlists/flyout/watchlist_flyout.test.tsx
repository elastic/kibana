/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { WatchlistFlyout } from './watchlist_flyout';
import { useWatchlistFormState, useWatchlistMutations } from './hooks';

const mockMutate = jest.fn();

jest.mock('./hooks', () => ({
  useWatchlistFormState: jest.fn(),
  useWatchlistMutations: jest.fn(),
}));

jest.mock('./watchlist_form', () => ({
  WatchlistForm: () => <div data-test-subj="mockWatchlistForm" />,
}));

const mockUseWatchlistFormState = useWatchlistFormState as jest.Mock;
const mockUseWatchlistMutations = useWatchlistMutations as jest.Mock;

const formState = (overrides: Record<string, unknown> = {}) => ({
  watchlist: { name: 'my watchlist', description: '', riskModifier: 1.5, managed: false },
  watchlistId: undefined,
  ruleBasedSourceIds: {},
  indexSourceWithMissingApiKey: undefined,
  isEditMode: false,
  isDisabled: false,
  isNameTooLong: false,
  isDescriptionTooLong: false,
  isRiskModifierInvalid: false,
  setWatchlistField: jest.fn(),
  ruleBasedSource: {},
  ...overrides,
});

const renderFlyout = (props: Partial<React.ComponentProps<typeof WatchlistFlyout>> = {}) => {
  const onClose = jest.fn();
  render(
    <I18nProvider>
      <WatchlistFlyout mode="create" spaceId="default" onClose={onClose} {...props} />
    </I18nProvider>
  );
  return { onClose };
};

describe('WatchlistFlyout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseWatchlistFormState.mockReturnValue(formState());
    mockUseWatchlistMutations.mockReturnValue({
      mutation: { mutate: mockMutate, isLoading: false },
    });
  });

  it('renders the create header and the form', () => {
    renderFlyout();

    expect(screen.getByTestId('watchlist-flyout-header')).toHaveTextContent('Create watchlist');
    expect(screen.getByTestId('mockWatchlistForm')).toBeInTheDocument();
    expect(mockUseWatchlistFormState).toHaveBeenCalledWith({
      mode: 'create',
      watchlistId: undefined,
    });
  });

  it('renders the edit header in edit mode', () => {
    mockUseWatchlistFormState.mockReturnValue(formState({ isEditMode: true, watchlistId: 'wl-1' }));
    renderFlyout({ mode: 'edit', watchlistId: 'wl-1' });

    expect(screen.getByTestId('watchlist-flyout-header')).toHaveTextContent('Edit watchlist');
    expect(mockUseWatchlistFormState).toHaveBeenCalledWith({ mode: 'edit', watchlistId: 'wl-1' });
  });

  it('saves with the mutation and closes the flyout on success', () => {
    const { onClose } = renderFlyout();

    fireEvent.click(screen.getByTestId('watchlist-flyout-save'));

    expect(mockMutate).toHaveBeenCalledTimes(1);
    expect(mockUseWatchlistMutations).toHaveBeenCalledWith(
      expect.objectContaining({ spaceId: 'default', isEditMode: false, onSuccess: onClose })
    );
  });

  it('disables save while the form is invalid', () => {
    mockUseWatchlistFormState.mockReturnValue(formState({ isDisabled: true }));
    renderFlyout();

    expect(screen.getByTestId('watchlist-flyout-save')).toBeDisabled();
  });

  it('calls onClose from the close button', () => {
    const { onClose } = renderFlyout();

    fireEvent.click(screen.getByTestId('euiFlyoutCloseButton'));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
