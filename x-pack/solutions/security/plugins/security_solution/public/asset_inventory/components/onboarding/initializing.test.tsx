/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { renderWithTestProvider } from '../../test/test_provider';
import { Initializing } from './initializing';
import { userEvent } from '@testing-library/user-event';
import { screen } from '@testing-library/dom';

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
  it('should navigate to the integrations page when clicking "Add integration" button', async () => {
    renderWithTestProvider(<Initializing />);

    expect(screen.getByText(/initializing asset inventory/i)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /add integration/i }));

    expect(mockNavigateToApp).toHaveBeenCalledWith('integrations');
  });
});
