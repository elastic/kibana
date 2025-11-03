/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { GettingStartedRedirectGate } from './getting_started_redirect_gate';
import { GETTING_STARTED_LOCALSTORAGE_KEY } from '@kbn/search-shared-ui';
import { useSearchGettingStartedFeatureFlag } from '../hooks/use_search_getting_started_feature_flag';

jest.mock('@kbn/search-shared-ui', () => ({
  GETTING_STARTED_LOCALSTORAGE_KEY: 'search.gettingStarted.visited',
}));

jest.mock('../hooks/use_search_getting_started_feature_flag', () => ({
  useSearchGettingStartedFeatureFlag: jest.fn(),
}));

describe('GettingStartedRedirectGate', () => {
  const navigateToApp = jest.fn();
  const coreStartMock = {
    application: {
      navigateToApp,
    },
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  const renderGate = () =>
    render(
      <GettingStartedRedirectGate coreStart={coreStartMock}>
        <div data-test-subj="child">Child content</div>
      </GettingStartedRedirectGate>
    );

  it('renders children', () => {
    (useSearchGettingStartedFeatureFlag as jest.Mock).mockReturnValue(true);
    const { getByTestId } = renderGate();
    expect(getByTestId('child')).toBeInTheDocument();
  });

  it('navigates if feature is enabled and localStorage key is missing', () => {
    (useSearchGettingStartedFeatureFlag as jest.Mock).mockReturnValue(true);
    renderGate();
    expect(navigateToApp).toHaveBeenCalledWith('searchGettingStarted');
  });

  it('navigates if feature is enabled and key is "false"', () => {
    (useSearchGettingStartedFeatureFlag as jest.Mock).mockReturnValue(true);
    localStorage.setItem(GETTING_STARTED_LOCALSTORAGE_KEY, 'false');
    renderGate();
    expect(navigateToApp).toHaveBeenCalledWith('searchGettingStarted');
  });

  it('does not navigate if key is "true"', () => {
    (useSearchGettingStartedFeatureFlag as jest.Mock).mockReturnValue(true);
    localStorage.setItem(GETTING_STARTED_LOCALSTORAGE_KEY, 'true');
    renderGate();
    expect(navigateToApp).not.toHaveBeenCalled();
  });

  it('does not navigate when feature flag is disabled', () => {
    (useSearchGettingStartedFeatureFlag as jest.Mock).mockReturnValue(false);
    renderGate();
    expect(navigateToApp).not.toHaveBeenCalled();
  });
});
