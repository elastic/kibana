/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { createMemoryHistory } from 'history';
import { render, screen } from '@testing-library/react';
import { Router } from '@kbn/shared-ux-router';
import { coreMock } from '@kbn/core/public/mocks';
import { GETTING_STARTED_LOCALSTORAGE_KEY } from '@kbn/search-shared-ui';
import { useKibana } from './hooks/use_kibana';
import { HomepageRouter } from './router';

jest.mock('./hooks/use_kibana', () => ({ useKibana: jest.fn() }));
jest.mock('./components/search_homepage/search_homepage', () => ({
  SearchHomepagePage: () => <div data-test-subj="searchHomepagePage" />,
}));

const mockUseKibana = useKibana as jest.Mock;

describe('HomepageRouter', () => {
  const { application } = coreMock.createStart();

  const renderRouter = () =>
    render(
      <Router history={createMemoryHistory()}>
        <HomepageRouter />
      </Router>
    );

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    mockUseKibana.mockReturnValue({ services: { application } });
  });

  it('sends a first-time visitor to getting started without rendering the home page', () => {
    renderRouter();

    expect(application.navigateToApp).toHaveBeenCalledWith('searchGettingStarted');
    expect(screen.queryByTestId('searchHomepagePage')).not.toBeInTheDocument();
  });

  it('renders the home page once getting started has been visited in this browser', () => {
    localStorage.setItem(GETTING_STARTED_LOCALSTORAGE_KEY, 'true');

    renderRouter();

    expect(application.navigateToApp).not.toHaveBeenCalled();
    expect(screen.getByTestId('searchHomepagePage')).toBeInTheDocument();
  });

  it('renders the home page without redirecting when local storage is unavailable', () => {
    const getItem = jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('storage unavailable');
    });

    renderRouter();

    expect(application.navigateToApp).not.toHaveBeenCalled();
    expect(screen.getByTestId('searchHomepagePage')).toBeInTheDocument();
    getItem.mockRestore();
  });
});
