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
import { I18nProvider } from '@kbn/i18n-react';
import { NotFoundPage } from './not_found';

describe('NotFoundPage', () => {
  it('render component', async () => {
    const { findByText } = render(
      <I18nProvider>
        <Router history={createMemoryHistory()}>
          <NotFoundPage />
        </Router>
      </I18nProvider>
    );

    expect(await findByText('Page not found')).toBeInTheDocument();
    expect(await findByText('Back to home')).toBeInTheDocument();
  });
});
