/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { AddDataSourcePanel } from './add_data_source';
import { TestProviders } from '../../../../common/mock';

const mockUseNavigation = jest.fn().mockReturnValue({
  navigateTo: jest.fn(),
});

jest.mock('../../../../common/lib/kibana', () => {
  const original = jest.requireActual('../../../../common/lib/kibana');
  return {
    ...original,
    useNavigation: () => mockUseNavigation(),
  };
});

jest.mock('../hooks/use_integrations', () => ({
  useEntityAnalyticsIntegrations: jest.fn(() => [
    {
      name: 'Okta',
      version: '1.0.0',
      title: 'Okta Integration',
      description: 'Okta integration description',
      icon: 'oktaIcon',
    },
    {
      name: 'Active Directory',
      version: '1.0.0',
      title: 'Active Directory Integration',
      description: 'Active Directory integration description',
      icon: 'adIcon',
    },
  ]),
}));

describe('AddDataSourcePanel', () => {
  it('renders the panel title and description', () => {
    render(<AddDataSourcePanel onComplete={() => {}} />, { wrapper: TestProviders });

    expect(screen.getByText('Add data source of your privileged users')).toBeInTheDocument();
    expect(
      screen.getByText(
        'To get started, define your privileged users by selecting an index with the relevant data, or importing your list of privileged users from a CSV file.'
      )
    ).toBeInTheDocument();
  });

  it('renders the file import card', () => {
    render(<AddDataSourcePanel onComplete={() => {}} />, { wrapper: TestProviders });

    const fileCard = screen.getByRole('button', { name: /file/i });
    expect(fileCard).toBeInTheDocument();
  });
});
