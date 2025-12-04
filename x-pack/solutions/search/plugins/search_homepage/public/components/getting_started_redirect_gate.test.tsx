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

jest.mock('@kbn/search-shared-ui', () => ({
  GETTING_STARTED_LOCALSTORAGE_KEY: 'search.gettingStarted.visited',
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
    const { getByTestId } = renderGate();
    expect(getByTestId('child')).toBeInTheDocument();
    // Wait for async effects to complete
    await waitFor(() => expect(getCurrent).toHaveBeenCalled());
  });

  describe.each([
    // [roles, visited, shouldNavigate, description]
    [['admin'], undefined, true, 'navigates when feature enabled, admin role, not visited'],
    [['admin'], 'false', true, 'navigates when feature enabled, admin role, visited=false'],
    [['admin'], 'true', false, 'does not navigate when already visited'],
    [['admin'], undefined, false, 'does not navigate when feature flag disabled'],
    [
      ['admin'],
      'false',
      false,
      'does not navigate when feature flag disabled even if visited=false',
    ],
    [['viewer'], undefined, false, 'does not navigate when user is viewer only'],
    [
      ['viewer'],
      'false',
      false,
      'does not navigate when user is viewer only even if visited=false',
    ],
    [['viewer'], 'true', false, 'does not navigate when user is viewer only and visited'],
    [['viewer', 'editor'], undefined, true, 'navigates when user has viewer plus other roles'],
    [['editor'], undefined, true, 'navigates when user has editor role'],
    [['editor', 'admin'], undefined, true, 'navigates when user has multiple non-viewer roles'],
    [[], undefined, true, 'navigates when user has no roles'],
  ])('navigation logic', (roles, visited, shouldNavigate, description) => {
    it(description, async () => {
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
