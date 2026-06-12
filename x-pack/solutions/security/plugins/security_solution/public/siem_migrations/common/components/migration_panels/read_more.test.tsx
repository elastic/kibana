/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { MigrationsReadMore } from './read_more';
import { TestProviders } from '../../../../common/mock';

jest.mock('../../../../common/lib/kibana/use_kibana', () => ({
  useKibana: () => ({
    services: {
      docLinks: {
        links: {
          securitySolution: {
            siemMigrations: 'https://example.com/docs',
          },
        },
      },
    },
  }),
}));

describe('MigrationsReadMore', () => {
  it('renders rule-specific data-test-subj', () => {
    render(<MigrationsReadMore migrationType="rule" />, {
      wrapper: TestProviders,
    });

    expect(screen.getByTestId('ruleMigrationReadMore')).toBeInTheDocument();
  });

  it('renders dashboard-specific data-test-subj', () => {
    render(<MigrationsReadMore migrationType="dashboard" />, {
      wrapper: TestProviders,
    });

    expect(screen.getByTestId('dashboardMigrationReadMore')).toBeInTheDocument();
  });

  it('links to documentation', () => {
    render(<MigrationsReadMore migrationType="rule" />, {
      wrapper: TestProviders,
    });

    const link = screen.getByText('Read AI docs');
    expect(link).toBeInTheDocument();
    expect(link.closest('a')).toHaveAttribute('href', 'https://example.com/docs');
  });
});
