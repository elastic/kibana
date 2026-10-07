/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '@kbn/i18n-react';
import { MetadataSearchBarHeader } from './metadata_search_bar_header';
import { useAssetDetailsUrlState } from '../../hooks/use_asset_details_url_state';

jest.mock('../../hooks/use_asset_details_url_state');

const useAssetDetailsUrlStateMock = useAssetDetailsUrlState as jest.MockedFunction<
  typeof useAssetDetailsUrlState
>;

const setUrlState = jest.fn();

const mockUrlState = (urlState: Record<string, unknown> | null = null) => {
  useAssetDetailsUrlStateMock.mockReturnValue([urlState, setUrlState] as ReturnType<
    typeof useAssetDetailsUrlState
  >);
};

const renderSearchBar = () =>
  render(
    <I18nProvider>
      <MetadataSearchBarHeader />
    </I18nProvider>
  );

const getSearchInput = () => screen.getByTestId('infraAssetDetailsMetadataSearchBarInput');

describe('MetadataSearchBarHeader', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockUrlState();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders an empty search field when no search term is in the url state', () => {
    renderSearchBar();

    expect(getSearchInput()).toHaveValue('');
    expect(getSearchInput()).toHaveAttribute('placeholder', 'Search for metadata…');
  });

  it('restores the search term from the url state', () => {
    mockUrlState({ metadataSearch: 'cloud' });
    renderSearchBar();

    expect(getSearchInput()).toHaveValue('cloud');
  });

  it('writes the search term to the url state once typing settles', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    renderSearchBar();

    await user.type(getSearchInput(), 'cloud');

    expect(getSearchInput()).toHaveValue('cloud');
    expect(setUrlState).not.toHaveBeenCalled();

    jest.advanceTimersByTime(300);

    expect(setUrlState).toHaveBeenCalledTimes(1);
    expect(setUrlState).toHaveBeenCalledWith({ metadataSearch: 'cloud' });
  });

  it('clears the search term in the url state when the field is emptied', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    mockUrlState({ metadataSearch: 'cloud' });
    renderSearchBar();

    await user.clear(getSearchInput());
    jest.advanceTimersByTime(300);

    expect(setUrlState).toHaveBeenCalledWith({ metadataSearch: '' });
  });
});
