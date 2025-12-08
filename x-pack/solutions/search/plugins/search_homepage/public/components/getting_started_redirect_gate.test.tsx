/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react';
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

  describe.each([
    // [visited, shouldNavigate, description]
    [undefined, true, 'navigates when not visited'],
    ['false', true, 'navigates when visited=false'],
    ['true', false, 'does not navigate when already visited'],
  ])('navigation logic', (visited, shouldNavigate, description) => {
    it(description, async () => {
      (useSearchGettingStartedFeatureFlag as jest.Mock).mockReturnValue(true);

      if (visited !== undefined) {
        localStorage.setItem(GETTING_STARTED_LOCALSTORAGE_KEY, visited);
      }

      renderGate();

      if (shouldNavigate) {
        await waitFor(() => expect(navigateToApp).toHaveBeenCalledWith('searchGettingStarted'));
      } else {
        expect(navigateToApp).not.toHaveBeenCalled();
      }
    });
  });
});
