/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderWithI18n as render } from '@kbn/test-jest-helpers';
import { MemoryRouter } from 'react-router-dom';
import { EntityAnalyticsWatchlistsManagementPage } from './entity_analytics_watchlists_management_page';
import { TestProviders } from '../../common/mock';

describe('EntityAnalyticsWatchlistsManagementPage', () => {
  it('renders the page header', () => {
    const { getByText } = render(
      <TestProviders>
        <MemoryRouter>
          <EntityAnalyticsWatchlistsManagementPage />
        </MemoryRouter>
      </TestProviders>
    );
    expect(getByText('Watchlists Management')).toBeInTheDocument();
  });
});
