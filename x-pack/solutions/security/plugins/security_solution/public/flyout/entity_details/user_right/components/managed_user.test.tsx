/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ManagedUserDatasetKey } from '../../../../../common/search_strategy/security_solution/users/managed_details';
import { render } from '@testing-library/react';
import React from 'react';
import { TestProviders } from '../../../../common/mock';

import { mockManagedUserData, mockOktaUserFields } from '../mocks';
import { ManagedUser } from './managed_user';

describe('ManagedUser', () => {
  const mockProps = {
    managedUser: mockManagedUserData,
    contextID: '',
    scopeId: '',
    openDetailsPanel: () => {},
    isLinkEnabled: true,
  };

  it('renders', () => {
    const { getByTestId } = render(
      <TestProviders>
        <ManagedUser {...mockProps} />
      </TestProviders>
    );

    expect(getByTestId('managedUser-data')).toBeInTheDocument();
  });

  it('renders the formatted date', () => {
    const { getByTestId } = render(
      <TestProviders>
        <ManagedUser {...mockProps} />
      </TestProviders>
    );

    expect(getByTestId('managedUser-data')).toHaveTextContent('Nov 16, 2023');
  });

  it('renders enable integration callout when the integration is disabled', () => {
    const { getByTestId } = render(
      <TestProviders>
        <ManagedUser
          {...{
            ...mockProps,
            managedUser: {
              ...mockManagedUserData,
              isIntegrationEnabled: false,
            },
          }}
        />
      </TestProviders>
    );

    expect(getByTestId('managedUser-integration-disable-callout')).toBeInTheDocument();
  });

  it('renders the call out when the integration is disabled', () => {
    const { queryByTestId } = render(
      <TestProviders>
        <ManagedUser
          {...{
            ...mockProps,
            managedUser: { ...mockManagedUserData, isIntegrationEnabled: false },
          }}
        />
      </TestProviders>
    );

    expect(queryByTestId('managedUser-integration-disable-callout')).toBeInTheDocument();
  });

  it("it doesn't show the call out when the user is loading", () => {
    const { queryByTestId } = render(
      <TestProviders>
        <ManagedUser
          {...{
            ...mockProps,
            managedUser: { ...mockManagedUserData, isLoading: true, isIntegrationEnabled: false },
          }}
        />
      </TestProviders>
    );

    expect(queryByTestId('managedUser-integration-disable-callout')).not.toBeInTheDocument();
  });

  it('renders Entra managed user', () => {
    const { getByTestId } = render(
      <TestProviders>
        <ManagedUser {...mockProps} />
      </TestProviders>
    );

    expect(getByTestId('managedUser-table')).toBeInTheDocument();
  });

  it('renders Okta managed user', () => {
    const { getByTestId } = render(
      <TestProviders>
        <ManagedUser
          {...{
            ...mockProps,
            managedUser: {
              ...mockManagedUserData,
              data: {
                [ManagedUserDatasetKey.OKTA]: {
                  fields: mockOktaUserFields,
                  _index: '123',
                  _id: '12234',
                },
              },
            },
          }}
        />
      </TestProviders>
    );

    expect(getByTestId('managedUser-table')).toBeInTheDocument();
  });
});
