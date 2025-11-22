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
  const getCurrent = jest.fn();
  const coreStartMock = {
    application: {
      navigateToApp,
    },
    userProfile: {
      getCurrent,
    },
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    // Default: return a user with 'admin' role
    getCurrent.mockResolvedValue({
      user: {
        roles: ['admin'],
      },
    });
  });

  const renderGate = () =>
    render(
      <GettingStartedRedirectGate coreStart={coreStartMock}>
        <div data-test-subj="child">Child content</div>
      </GettingStartedRedirectGate>
    );

  it('renders children', async () => {
    (useSearchGettingStartedFeatureFlag as jest.Mock).mockReturnValue(true);
    const { getByTestId } = renderGate();
    expect(getByTestId('child')).toBeInTheDocument();
    // Wait for async effects to complete
    await waitFor(() => expect(getCurrent).toHaveBeenCalled());
  });

  describe.each([
    // [featureFlag, roles, visited, shouldNavigate, description]
    [true, ['admin'], undefined, true, 'navigates when feature enabled, admin role, not visited'],
    [true, ['admin'], 'false', true, 'navigates when feature enabled, admin role, visited=false'],
    [true, ['admin'], 'true', false, 'does not navigate when already visited'],
    [false, ['admin'], undefined, false, 'does not navigate when feature flag disabled'],
    [
      false,
      ['admin'],
      'false',
      false,
      'does not navigate when feature flag disabled even if visited=false',
    ],
    [true, ['viewer'], undefined, false, 'does not navigate when user is viewer only'],
    [
      true,
      ['viewer'],
      'false',
      false,
      'does not navigate when user is viewer only even if visited=false',
    ],
    [true, ['viewer'], 'true', false, 'does not navigate when user is viewer only and visited'],
    [
      false,
      ['viewer'],
      undefined,
      false,
      'does not navigate when viewer and feature flag disabled',
    ],
    [
      true,
      ['viewer', 'editor'],
      undefined,
      true,
      'navigates when user has viewer plus other roles',
    ],
    [true, ['editor'], undefined, true, 'navigates when user has editor role'],
    [
      true,
      ['editor', 'admin'],
      undefined,
      true,
      'navigates when user has multiple non-viewer roles',
    ],
    [true, [], undefined, true, 'navigates when user has no roles'],
  ])('navigation logic', (featureFlag, roles, visited, shouldNavigate, description) => {
    it(description, async () => {
      (useSearchGettingStartedFeatureFlag as jest.Mock).mockReturnValue(featureFlag);
      getCurrent.mockResolvedValue({
        user: {
          roles,
        },
      });

      if (visited !== undefined) {
        localStorage.setItem(GETTING_STARTED_LOCALSTORAGE_KEY, visited);
      }

      renderGate();
      await waitFor(() => expect(getCurrent).toHaveBeenCalled());

      if (shouldNavigate) {
        await waitFor(() => expect(navigateToApp).toHaveBeenCalledWith('searchGettingStarted'));
      } else {
        expect(navigateToApp).not.toHaveBeenCalled();
      }
    });
  });
});
