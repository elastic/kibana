/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { BehaviorSubject } from 'rxjs';
import { CoreProviders } from '../public/apps/common_providers';
import { createStartServicesAccessorMock } from '../public/components/infrastructure_node_metrics_tables/test_helpers';

export const parameters = {
  docs: {
    source: {
      type: 'code', // without this, stories in mdx documents freeze the browser
    },
  },
};

// Add a global decorator that wraps all stories with Router context and CoreProviders
// This ensures hooks like useLocation have the necessary context
export const decorators = [
  (StoryFn) => {
    const { coreProvidersPropsMock } = createStartServicesAccessorMock();

    // Ensure the CoreStart mock includes proper Observable mocks for RxJS subscriptions
    coreProvidersPropsMock.core.application.currentAppId$ = new BehaviorSubject('metrics');

    // Ensure the CoreStart mock includes a share.locators.get implementation
    const MOCK_HREF = '/app/r?l=ASSET_DETAILS_LOCATOR&v=8.15.0&lz=MoCkLoCaToRvAlUe';
    const mockLocator = {
      getRedirectUrl: () => MOCK_HREF,
      navigate: () => {},
    };

    if (!coreProvidersPropsMock.core.share) {
      coreProvidersPropsMock.core.share = {};
    }
    if (!coreProvidersPropsMock.core.share.url) {
      coreProvidersPropsMock.core.share.url = {};
    }
    coreProvidersPropsMock.core.share.url.locators = {
      get: () => mockLocator,
    };

    return (
      <MemoryRouter>
        <CoreProviders {...coreProvidersPropsMock}>
          <StoryFn />
        </CoreProviders>
      </MemoryRouter>
    );
  },
];
