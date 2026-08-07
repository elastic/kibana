/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { createMemoryHistory } from 'history';
import { Router } from '@kbn/shared-ux-router';
import { createMockWatch } from '@kbn/pnd-common';
import { WatchesPage } from '.';

const mockUseWatches = jest.fn();

jest.mock('../../hooks/use_watches_api', () => ({
  useWatches: () => mockUseWatches(),
}));

jest.mock('../../hooks/use_pnd_doc_title', () => ({
  usePndDocTitle: jest.fn(),
}));

describe('WatchesPage', () => {
  it('redirects to the first watch in display order', () => {
    mockUseWatches.mockReturnValue({
      data: {
        watches: [
          createMockWatch({ id: 'second-watch', sortOrder: 20 }),
          createMockWatch({ id: 'first-watch', sortOrder: 10 }),
        ],
        setupFailed: [],
      },
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });
    const history = createMemoryHistory({ initialEntries: ['/watches'] });

    render(
      <Router history={history}>
        <WatchesPage />
      </Router>
    );

    expect(history.location.pathname).toBe('/watches/first-watch');
  });
});
