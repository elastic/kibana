/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { EmptyMigrationDashboardsPage } from './empty';
import { TestProviders } from '../../../common/mock/test_providers';

describe('EmptyMigrationDashboardsPage', () => {
  it('renders the correct header', () => {
    const { getByTestId } = render(<EmptyMigrationDashboardsPage />, {
      wrapper: TestProviders,
    });
    expect(getByTestId('siemMigrationsTranslatedDashboardsEmptyPageHeader')).toHaveTextContent(
      'No migrations to View'
    );
  });

  it('renders the correct message', () => {
    const { getByTestId } = render(<EmptyMigrationDashboardsPage />, {
      wrapper: TestProviders,
    });
    expect(getByTestId('siemMigrationsTranslatedDashboardsEmptyPageMessage')).toHaveTextContent(
      'Translate your existing SIEM Dashboards with Elastic Automatic Migration. Go to Automatic Migration for step-by-step guidance.'
    );
  });

  it('renders the correct call-to-action button', () => {
    const { getByRole } = render(<EmptyMigrationDashboardsPage />, {
      wrapper: TestProviders,
    });
    expect(getByRole('button', { name: 'Start Automatic Migration' })).toBeInTheDocument();
  });
});
