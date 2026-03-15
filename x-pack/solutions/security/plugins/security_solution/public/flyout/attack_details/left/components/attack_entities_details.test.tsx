/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import { AttackDetailsContext } from '../../context';
import { AttackEntitiesDetails } from './attack_entities_details';

jest.mock('@kbn/i18n-react', () => ({
  FormattedMessage: ({
    defaultMessage,
    values,
  }: {
    defaultMessage: string;
    values?: { userCount?: number; hostCount?: number };
  }) => {
    if (values?.userCount !== undefined) {
      return (
        <span>
          {values.userCount === 1 ? 'User' : 'Users'}
          {':'}
        </span>
      );
    }
    if (values?.hostCount !== undefined) {
      return (
        <span>
          {values.hostCount === 1 ? 'Host' : 'Hosts'}
          {':'}
        </span>
      );
    }
    return <span>{defaultMessage}</span>;
  },
}));

jest.mock('../../hooks/use_header_data', () => ({
  useHeaderData: jest.fn(),
}));

jest.mock('../../hooks/use_attack_entities_lists', () => ({
  useAttackEntitiesLists: jest.fn(),
}));

jest.mock('../../../document_details/left/components/user_details', () => ({
  UserDetails: ({
    entityIdentifiers,
    timestamp,
    scopeId,
  }: {
    entityIdentifiers: Record<string, string>;
    timestamp: string;
    scopeId: string;
  }) => (
    <div
      data-test-subj="user-details"
      data-user-name={entityIdentifiers['user.name'] ?? Object.values(entityIdentifiers)[0]}
      data-timestamp={timestamp}
      data-scope-id={scopeId}
    >
      {'UserDetails:'} {entityIdentifiers['user.name'] ?? Object.values(entityIdentifiers)[0]}
    </div>
  ),
}));

jest.mock('../../../document_details/left/components/host_details', () => ({
  HostDetails: ({
    entityIdentifiers,
    timestamp,
    scopeId,
  }: {
    entityIdentifiers: Record<string, string>;
    timestamp: string;
    scopeId: string;
  }) => (
    <div
      data-test-subj="host-details"
      data-host-name={entityIdentifiers['host.name'] ?? Object.values(entityIdentifiers)[0]}
      data-timestamp={timestamp}
      data-scope-id={scopeId}
    >
      {'HostDetails:'} {entityIdentifiers['host.name'] ?? Object.values(entityIdentifiers)[0]}
    </div>
  ),
}));

const useHeaderData = jest.requireMock('../../hooks/use_header_data').useHeaderData as jest.Mock;
const useAttackEntitiesLists = jest.requireMock('../../hooks/use_attack_entities_lists')
  .useAttackEntitiesLists as jest.Mock;

const mockContextValue = {
  attackId: 'attack-1',
  indexName: '.alerts-default',
  scopeId: 'test-scope-id',
  getFieldsData: () => null,
  browserFields: {},
  dataFormattedForFieldBrowser: [],
  searchHit: {},
  refetch: jest.fn(),
};

const renderWithProvider = (ui: React.ReactElement) =>
  render(
    <EuiProvider>
      <AttackDetailsContext.Provider
        value={
          mockContextValue as unknown as React.ComponentProps<
            typeof AttackDetailsContext.Provider
          >['value']
        }
      >
        {ui}
      </AttackDetailsContext.Provider>
    </EuiProvider>
  );

describe('AttackEntitiesDetails', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useHeaderData.mockReturnValue({ timestamp: '2024-01-01T00:00:00Z' });
    useAttackEntitiesLists.mockReturnValue({
      userEntityIdentifiers: [],
      hostEntityIdentifiers: [],
      loading: false,
      error: false,
    });
  });

  it('renders loading skeleton when loading is true', () => {
    useAttackEntitiesLists.mockReturnValue({
      userEntityIdentifiers: [],
      hostEntityIdentifiers: [],
      loading: true,
      error: false,
    });

    renderWithProvider(<AttackEntitiesDetails />);

    expect(screen.getByTestId('attack-entities-details-loading')).toBeInTheDocument();
    expect(screen.queryByTestId('attack-entities-details')).not.toBeInTheDocument();
  });

  it('renders error message when error is true', () => {
    useAttackEntitiesLists.mockReturnValue({
      userEntityIdentifiers: [],
      hostEntityIdentifiers: [],
      loading: false,
      error: true,
    });

    renderWithProvider(<AttackEntitiesDetails />);

    expect(
      screen.getByText('Unable to load host and user information for this attack.')
    ).toBeInTheDocument();
    expect(screen.queryByTestId('attack-entities-details')).not.toBeInTheDocument();
  });

  it('renders no data message when userEntityIdentifiers and hostEntityIdentifiers are empty', () => {
    useAttackEntitiesLists.mockReturnValue({
      userEntityIdentifiers: [],
      hostEntityIdentifiers: [],
      loading: false,
      error: false,
    });

    renderWithProvider(<AttackEntitiesDetails />);

    expect(
      screen.getByText('Host and user information are unavailable for this attack.')
    ).toBeInTheDocument();
    expect(screen.queryByTestId('attack-entities-details')).not.toBeInTheDocument();
  });

  it('renders User and Host sections with UserDetails and HostDetails when data is present', () => {
    useAttackEntitiesLists.mockReturnValue({
      userEntityIdentifiers: [{ 'user.name': 'user1' }, { 'user.name': 'user2' }],
      hostEntityIdentifiers: [{ 'host.name': 'host1' }],
      loading: false,
      error: false,
    });

    renderWithProvider(<AttackEntitiesDetails />);

    expect(screen.getByTestId('attack-entities-details')).toBeInTheDocument();
    expect(screen.getByText(/Users:/)).toBeInTheDocument();
    expect(screen.getByText(/Host:/)).toBeInTheDocument();

    expect(screen.getByText('UserDetails: user1')).toBeInTheDocument();
    expect(screen.getByText('UserDetails: user2')).toBeInTheDocument();
    expect(screen.getByText('HostDetails: host1')).toBeInTheDocument();
  });

  it('renders singular User and Host titles when each list has at most one item', () => {
    useAttackEntitiesLists.mockReturnValue({
      userEntityIdentifiers: [{ 'user.name': 'user1' }],
      hostEntityIdentifiers: [{ 'host.name': 'host1' }],
      loading: false,
      error: false,
    });

    renderWithProvider(<AttackEntitiesDetails />);

    expect(screen.getByText(/User:/)).toBeInTheDocument();
    expect(screen.getByText(/Host:/)).toBeInTheDocument();
  });

  it('renders plural Users and Hosts titles when each list has more than one item', () => {
    useAttackEntitiesLists.mockReturnValue({
      userEntityIdentifiers: [{ 'user.name': 'user1' }, { 'user.name': 'user2' }],
      hostEntityIdentifiers: [{ 'host.name': 'host1' }, { 'host.name': 'host2' }],
      loading: false,
      error: false,
    });

    renderWithProvider(<AttackEntitiesDetails />);

    expect(screen.getByText(/Users:/)).toBeInTheDocument();
    expect(screen.getByText(/Hosts:/)).toBeInTheDocument();
  });

  it('passes scopeId and timestamp to UserDetails and HostDetails', () => {
    useHeaderData.mockReturnValue({ timestamp: '2025-06-15T12:00:00Z' });
    useAttackEntitiesLists.mockReturnValue({
      userEntityIdentifiers: [{ 'user.name': 'alice' }],
      hostEntityIdentifiers: [{ 'host.name': 'host-a' }],
      loading: false,
      error: false,
    });

    renderWithProvider(<AttackEntitiesDetails />);

    const userDetails = screen.getByTestId('user-details');
    const hostDetails = screen.getByTestId('host-details');

    expect(userDetails).toHaveAttribute('data-scope-id', 'test-scope-id');
    expect(userDetails).toHaveAttribute('data-timestamp', '2025-06-15T12:00:00Z');
    expect(userDetails).toHaveAttribute('data-user-name', 'alice');

    expect(hostDetails).toHaveAttribute('data-scope-id', 'test-scope-id');
    expect(hostDetails).toHaveAttribute('data-timestamp', '2025-06-15T12:00:00Z');
    expect(hostDetails).toHaveAttribute('data-host-name', 'host-a');
  });

  it('uses empty string for timestamp when timestamp is null', () => {
    useHeaderData.mockReturnValue({ timestamp: null });
    useAttackEntitiesLists.mockReturnValue({
      userEntityIdentifiers: [{ 'user.name': 'user1' }],
      hostEntityIdentifiers: [],
      loading: false,
      error: false,
    });

    renderWithProvider(<AttackEntitiesDetails />);

    const userDetails = screen.getByTestId('user-details');
    expect(userDetails).toHaveAttribute('data-timestamp', '');
  });
});
