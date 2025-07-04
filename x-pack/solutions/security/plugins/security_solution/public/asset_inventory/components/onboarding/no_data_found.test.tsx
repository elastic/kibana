/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { screen } from '@testing-library/react';
import { NoDataFound } from './no_data_found';
import { renderWithTestProvider } from '../../test/test_provider';
import { mockUseAddIntegrationPath } from './hooks/use_add_integration_path.mock';
import { useAddIntegrationPath } from './hooks/use_add_integration_path';

jest.mock('./hooks/use_add_integration_path');

describe('NoDataFound Component', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('should render the No Data Found with an add integration link using the integration path', () => {
    (useAddIntegrationPath as jest.Mock).mockReturnValue(
      mockUseAddIntegrationPath({ addIntegrationPath: '/test-integration-path', isLoading: false })
    );

    renderWithTestProvider(<NoDataFound />);

    expect(
      screen.getByRole('heading', { name: /connect sources to discover assets/i })
    ).toBeInTheDocument();

    // Check that the add integration link is present and has the correct href
    const addLink = screen.getByRole('link', { name: /add integration/i });
    expect(addLink).toBeInTheDocument();
    expect(addLink).toHaveAttribute('href', '/test-integration-path');
    expect(addLink).not.toBeDisabled();
  });

  it('should disable the add integration button when loading', () => {
    (useAddIntegrationPath as jest.Mock).mockReturnValue(
      mockUseAddIntegrationPath({ isLoading: true })
    );

    renderWithTestProvider(<NoDataFound />);

    const addButton = screen.getByRole('button', { name: /add integration/i });
    expect(addButton).toBeDisabled();
  });
});
