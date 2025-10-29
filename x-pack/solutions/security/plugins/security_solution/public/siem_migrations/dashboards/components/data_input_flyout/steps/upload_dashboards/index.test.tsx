/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { DashboardsUploadStep } from '.';
import { TestProviders } from '../../../../../../common/mock/test_providers';
import { DashboardUploadSteps } from '../constants';

describe('DashboardsUploadStep', () => {
  const defaultProps = {
    migrationStats: undefined,
    onMigrationCreated: jest.fn(),
    onMissingResourcesFetched: jest.fn(),
  };

  it('renders the step number', () => {
    const { getByTestId } = render(
      <TestProviders>
        <DashboardsUploadStep {...defaultProps} />
      </TestProviders>
    );

    expect(getByTestId('dashboardsUploadStepNumber')).toBeInTheDocument();
    expect(getByTestId('dashboardsUploadStepNumber')).toHaveTextContent(/Current step is 1/);
  });

  it('renders the title', () => {
    const { getByTestId } = render(
      <TestProviders>
        <DashboardsUploadStep {...defaultProps} />
      </TestProviders>
    );

    expect(getByTestId('dashboardsUploadTitle')).toBeInTheDocument();
    expect(getByTestId('dashboardsUploadTitle')).toHaveTextContent('Upload dashboards to migrate');
  });

  it('renders sub-steps when the step is current', () => {
    const { getByTestId } = render(
      <TestProviders>
        <DashboardsUploadStep
          {...defaultProps}
          dataInputStep={DashboardUploadSteps.DashboardsUpload}
        />
      </TestProviders>
    );

    expect(getByTestId('migrationsSubSteps')).toBeInTheDocument();
  });

  it('does not render sub-steps when the step is not current', () => {
    const { queryByTestId } = render(
      <TestProviders>
        <DashboardsUploadStep
          {...defaultProps}
          dataInputStep={DashboardUploadSteps.LookupsUpload}
        />
      </TestProviders>
    );

    expect(queryByTestId('migrationsSubSteps')).not.toBeInTheDocument();
  });
});
