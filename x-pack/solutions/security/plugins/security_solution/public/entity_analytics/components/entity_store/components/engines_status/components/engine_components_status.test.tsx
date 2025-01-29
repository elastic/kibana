/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { EngineComponentsStatusTable } from './engine_components_status';
import {
  EngineComponentResourceEnum,
  type EngineComponentStatus,
} from '../../../../../../../common/api/entity_analytics';
import { TestProviders } from '../../../../../../common/mock';

const uninstalledWithErrorsComponent = {
  id: 'entity_engine_id',
  installed: false,
  resource: EngineComponentResourceEnum.entity_engine,
  errors: [{ title: 'Error 1', message: 'Error message 1' }],
};

const installedComponent = {
  id: 'index_id',
  resource: EngineComponentResourceEnum.index,
  errors: [],
  installed: true,
};

const mockComponents: EngineComponentStatus[] = [
  uninstalledWithErrorsComponent,
  installedComponent,
];

const mockGetUrlForApp = jest.fn();

jest.mock('../../../../../../common/lib/kibana', () => {
  return {
    useKibana: jest.fn().mockReturnValue({
      services: {
        application: {
          getUrlForApp: () => mockGetUrlForApp(),
          navigateToApp: jest.fn(),
        },
      },
    }),
  };
});

describe('EngineComponentsStatusTable', () => {
  it('renders the table with components', () => {
    render(<EngineComponentsStatusTable components={mockComponents} />, { wrapper: TestProviders });
    expect(screen.getByTestId('engine-components-status-table')).toBeInTheDocument();
  });

  it('expands and collapses rows correctly', () => {
    render(<EngineComponentsStatusTable components={mockComponents} />, { wrapper: TestProviders });

    const toggleButton = screen.getByLabelText('Expand');
    fireEvent.click(toggleButton);

    expect(screen.getByText('Error 1')).toBeInTheDocument();
    expect(screen.getByText('Error message 1')).toBeInTheDocument();

    fireEvent.click(toggleButton);

    expect(screen.queryByText('Error 1')).not.toBeInTheDocument();
    expect(screen.queryByText('Error message 1')).not.toBeInTheDocument();
  });

  describe('columns', () => {
    it('renders the correct resource text', () => {
      render(<EngineComponentsStatusTable components={[installedComponent]} />, {
        wrapper: TestProviders,
      });
      expect(screen.getByText('Index')).toBeInTheDocument();
    });

    it('renders checkmark on installation column when installed', () => {
      render(<EngineComponentsStatusTable components={[installedComponent]} />, {
        wrapper: TestProviders,
      });

      const icon = screen.getByTestId('installation-status');

      expect(icon).toHaveAttribute('data-euiicon-type', 'check');
    });

    it('renders cross on installation column when installed', () => {
      render(<EngineComponentsStatusTable components={[uninstalledWithErrorsComponent]} />, {
        wrapper: TestProviders,
      });

      const icon = screen.getByTestId('installation-status');

      expect(icon).toHaveAttribute('data-euiicon-type', 'cross');
    });

    it('renders the correct health status', () => {
      render(<EngineComponentsStatusTable components={[installedComponent]} />, {
        wrapper: TestProviders,
      });

      expect(screen.queryByRole('img', { name: /health/i })).not.toBeInTheDocument();
    });

    it('renders the correct identifier link', () => {
      mockGetUrlForApp.mockReturnValue('mockedUrl');

      render(<EngineComponentsStatusTable components={[installedComponent]} />, {
        wrapper: TestProviders,
      });
      const link = screen.getByRole('link');
      expect(link).toHaveAttribute('href', 'mockedUrl');
    });
  });
});
