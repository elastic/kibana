/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { MigrationsLastError } from './last_error';
import { TestProviders } from '../../../../common/mock';

describe('MigrationsLastError', () => {
  const testMessage = 'This is a test error message';

  it('renders rule error message correctly', () => {
    render(<MigrationsLastError message={testMessage} migrationType="rule" />, {
      wrapper: TestProviders,
    });

    expect(screen.getByTestId('ruleMigrationLastError')).toBeInTheDocument();
    expect(screen.getByText(testMessage)).toBeInTheDocument();
  });

  it('renders dashboard error message correctly', () => {
    render(<MigrationsLastError message={testMessage} migrationType="dashboard" />, {
      wrapper: TestProviders,
    });

    expect(screen.getByTestId('dashboardMigrationLastError')).toBeInTheDocument();
    expect(screen.getByText(testMessage)).toBeInTheDocument();
  });
});
