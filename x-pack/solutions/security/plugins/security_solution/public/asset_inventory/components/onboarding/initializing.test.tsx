/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { renderWithTestProvider } from '../../test/test_provider';
import { Initializing } from './initializing';
import { screen } from '@testing-library/react';

import { mockUseAddIntegrationPath } from './hooks/use_add_integration_path.mock';
import { useAddIntegrationPath } from './hooks/use_add_integration_path';

jest.mock('./hooks/use_add_integration_path');

const mockNavigateToApp = jest.fn();
jest.mock('../../../common/lib/kibana', () => ({
  useKibana: () => ({
    services: {
      application: {
        navigateToApp: mockNavigateToApp,
      },
    },
  }),
}));

describe('Initializing', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('should render and have the correct add integration link href and enabled state', () => {
    (useAddIntegrationPath as jest.Mock).mockReturnValue(
      mockUseAddIntegrationPath({ addIntegrationPath: '/test-integration-path', isLoading: false })
    );

    renderWithTestProvider(<Initializing />);

    expect(screen.getByRole('heading', { name: /discovering your assets/i })).toBeInTheDocument();

    const addLink = screen.getByRole('link', { name: /add integration/i });
    expect(addLink).toBeInTheDocument();
    expect(addLink).toHaveAttribute('href', '/test-integration-path');
    expect(addLink).not.toBeDisabled();
  });

  it('should disable the add integration button when loading', () => {
    (useAddIntegrationPath as jest.Mock).mockReturnValue(
      mockUseAddIntegrationPath({ isLoading: true })
    );

    renderWithTestProvider(<Initializing />);

    const addButton = screen.getByRole('button', { name: /add integration/i });
    expect(addButton).toBeDisabled();
  });
});
