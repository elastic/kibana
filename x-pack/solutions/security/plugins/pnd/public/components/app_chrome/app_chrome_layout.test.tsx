/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';

import { renderWithPndProviders } from '../test_utils/render_with_pnd_providers';
import { AppChromeLayout } from './app_chrome_layout';

const services = {
  application: { getUrlForApp: jest.fn(), navigateToApp: jest.fn() },
  http: { get: jest.fn(async () => ({ correlationId: 'ad-1', steps: [] })) },
};

const render = (route: string) =>
  renderWithPndProviders(
    <AppChromeLayout>
      <div data-test-subj="pndTestPage" />
    </AppChromeLayout>,
    { route, services }
  );

describe('AppChromeLayout', () => {
  it('renders the page it wraps', () => {
    render('/watches/activity');

    expect(screen.getByTestId('pndTestPage')).toBeInTheDocument();
  });

  it('renders no lifecycle overlay by default', () => {
    render('/watches/activity');

    expect(screen.queryByTestId('pndLifecycleFlyout')).not.toBeInTheDocument();
  });

  it('hosts the lifecycle overlay above every route, so a page needs only useOpenLifecycle', () => {
    render('/watches/activity?lifecycle=ad-1');

    expect(screen.getByTestId('pndLifecycleFlyout')).toBeInTheDocument();
  });
});
