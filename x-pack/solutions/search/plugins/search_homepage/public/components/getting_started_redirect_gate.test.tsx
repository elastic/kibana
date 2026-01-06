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

  it('renders children when already visited', () => {
    localStorage.setItem(GETTING_STARTED_LOCALSTORAGE_KEY, 'true');
    const { getByTestId } = renderGate();
    expect(getByTestId('child')).toBeInTheDocument();
    expect(navigateToApp).not.toHaveBeenCalled();
  });

  it('does NOT render children and redirects when not visited', async () => {
    const { queryByTestId } = renderGate();
    expect(queryByTestId('child')).not.toBeInTheDocument();
    await waitFor(() => expect(navigateToApp).toHaveBeenCalledWith('searchGettingStarted'));
  });

  it('does NOT render children and redirects when visited=false', async () => {
    localStorage.setItem(GETTING_STARTED_LOCALSTORAGE_KEY, 'false');
    const { queryByTestId } = renderGate();
    expect(queryByTestId('child')).not.toBeInTheDocument();
    await waitFor(() => expect(navigateToApp).toHaveBeenCalledWith('searchGettingStarted'));
  });
});
