/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { AddDataSourcePanel } from './add_data_source';
import { TestProviders } from '../../../common/mock';

const mockUseNavigation = jest.fn().mockReturnValue({
  navigateTo: jest.fn(),
});

jest.mock('../../../common/lib/kibana', () => {
  const original = jest.requireActual('../../../common/lib/kibana');

  return {
    ...original,
    useNavigation: () => mockUseNavigation(),
  };
});

jest.mock('../../../common/hooks/integrations/use_integration_link_state', () => ({
  useIntegrationLinkState: jest.fn(() => ({})),
}));

describe('AddDataSourcePanel', () => {
  it('renders the panel title and description', () => {
    render(<AddDataSourcePanel />, { wrapper: TestProviders });

    expect(screen.getByText('Add data source of your privileged users')).toBeInTheDocument();
    expect(
      screen.getByText(
        'To get started, define your privileged users by adding an integration with your organization’s user identities, select an index with the relevant data, or import your list of privileged users from a CSV file.'
      )
    ).toBeInTheDocument();
  });

  it('renders integration cards and handles navigation on click', () => {
    const mockNavigateTo = jest.fn();
    mockUseNavigation.mockReturnValue({
      navigateTo: mockNavigateTo,
    });

    render(<AddDataSourcePanel />, { wrapper: TestProviders });

    const integrationCards = screen.getAllByTestId('entity_analytics-integration-card');
    expect(integrationCards.length).toBe(3);

    fireEvent.click(integrationCards[0]);
    expect(mockNavigateTo).toHaveBeenCalled();
  });

  it('renders the file import card', () => {
    render(<AddDataSourcePanel />, { wrapper: TestProviders });

    const fileCard = screen.getByRole('button', { name: /file/i });
    expect(fileCard).toBeInTheDocument();
  });
});
