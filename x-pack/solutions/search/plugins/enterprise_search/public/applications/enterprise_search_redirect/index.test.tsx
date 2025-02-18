/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { MemoryRouter } from 'react-router-dom';

import { render, waitFor } from '@testing-library/react';

import { useKibana } from '@kbn/kibana-react-plugin/public';

import { ApplicationRedirect } from '.';

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  useKibana: jest.fn(),
}));

describe('RedirectWithReplace', () => {
  const navigateToUrlMock = jest.fn();
  const coreMock = {
    application: {
      navigateToUrl: navigateToUrlMock,
    },
  };

  beforeEach(() => {
    (useKibana as jest.Mock).mockReturnValue({ services: coreMock });

    // Mock window.location.pathname
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { pathname: '/enterprise_search/content/search_indices' },
    });
  });

  it('should redirect to the new path', async () => {
    render(
      <MemoryRouter>
        <ApplicationRedirect />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(navigateToUrlMock).toHaveBeenCalledWith('/elasticsearch/content/search_indices');
    });
  });
});
