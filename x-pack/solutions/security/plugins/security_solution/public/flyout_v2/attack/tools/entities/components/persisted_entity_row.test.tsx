/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { TestProviders } from '../../../../../common/mock';
import { PersistedEntityRow, getEntityNameFromEuid } from './persisted_entity_row';
import { useEntityFromStore } from '../../../../../flyout/entity_details/shared/hooks/use_entity_from_store';
import {
  ATTACK_ENTITIES_TOOL_PERSISTED_ROW_LOADING_TEST_ID,
  ATTACK_ENTITIES_TOOL_SERVICE_ROW_TEST_ID,
} from '../test_ids';

jest.mock('../../../../../flyout/entity_details/shared/hooks/use_entity_from_store');
jest.mock('../../../../../flyout/document_details/left/components/host_details', () => ({
  HostDetails: ({ hostName, entityId }: { hostName: string; entityId?: string }) => (
    <div data-test-subj="mock-host-details">
      <span data-test-subj="mock-host-name">{hostName}</span>
      <span data-test-subj="mock-host-entity-id">{entityId}</span>
    </div>
  ),
}));
jest.mock('../../../../../flyout/document_details/left/components/user_details', () => ({
  UserDetails: ({ userName, entityId }: { userName: string; entityId?: string }) => (
    <div data-test-subj="mock-user-details">
      <span data-test-subj="mock-user-name">{userName}</span>
      <span data-test-subj="mock-user-entity-id">{entityId}</span>
    </div>
  ),
}));

const mockUseEntityFromStore = useEntityFromStore as jest.Mock;

const emptyStoreResult = {
  entity: null,
  entityRecord: null,
  firstSeen: null,
  lastSeen: null,
  isLoading: false,
  isInitialLoading: false,
  error: null,
  refetch: jest.fn(),
};

const renderRow = (props: Partial<React.ComponentProps<typeof PersistedEntityRow>> = {}) =>
  render(
    <TestProviders>
      <PersistedEntityRow
        entityId="user:jane@acme.com@okta"
        entityType="user"
        timestamp="2024-01-01T00:00:00.000Z"
        {...props}
      />
    </TestProviders>
  );

describe('getEntityNameFromEuid', () => {
  it('parses the segment before the first @ for medium-confidence user EUIDs', () => {
    expect(getEntityNameFromEuid('user:jdoe@HW-UUID@local', 'user')).toBe('jdoe');
  });

  it('parses host EUIDs without @ segments', () => {
    expect(getEntityNameFromEuid('host:HW-UUID', 'host')).toBe('HW-UUID');
  });

  it('returns the raw EUID when parsing yields an empty segment', () => {
    expect(getEntityNameFromEuid('user:@domain', 'user')).toBe('user:@domain');
  });
});

describe('PersistedEntityRow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseEntityFromStore.mockReturnValue(emptyStoreResult);
  });

  it('queries the entity store by the persisted EUID alone', () => {
    renderRow();

    expect(mockUseEntityFromStore).toHaveBeenCalledWith({
      entityId: 'user:jane@acme.com@okta',
      entityType: 'user',
      skip: false,
    });
  });

  it('shows a loading skeleton while the store record is being fetched', () => {
    mockUseEntityFromStore.mockReturnValue({ ...emptyStoreResult, isInitialLoading: true });

    renderRow();

    expect(
      screen.getByTestId(ATTACK_ENTITIES_TOOL_PERSISTED_ROW_LOADING_TEST_ID)
    ).toBeInTheDocument();
    expect(screen.queryByTestId('mock-user-details')).not.toBeInTheDocument();
  });

  describe('user rows', () => {
    it('displays the plain user.name from the store record but keeps the persisted EUID', () => {
      mockUseEntityFromStore.mockReturnValue({
        ...emptyStoreResult,
        entityRecord: {
          entity: { id: 'user:jane@acme.com@okta', name: 'user:jane@acme.com@okta' },
          user: { name: 'jane' },
        },
      });

      renderRow();

      expect(screen.getByTestId('mock-user-name')).toHaveTextContent('jane');
      expect(screen.getByTestId('mock-user-entity-id')).toHaveTextContent(
        'user:jane@acme.com@okta'
      );
    });

    it('falls back to parsing the EUID when the store record is missing', () => {
      renderRow({ entityId: 'user:jdoe@HW-UUID@local' });

      expect(screen.getByTestId('mock-user-name')).toHaveTextContent('jdoe');
      expect(screen.getByTestId('mock-user-entity-id')).toHaveTextContent(
        'user:jdoe@HW-UUID@local'
      );
    });

    it('calls buildEntityOverrides with the display name and the persisted EUID', () => {
      mockUseEntityFromStore.mockReturnValue({
        ...emptyStoreResult,
        entityRecord: {
          entity: { id: 'user:jane@acme.com@okta' },
          user: { name: 'jane' },
        },
      });
      const buildEntityOverrides = jest.fn().mockReturnValue({});

      renderRow({ buildEntityOverrides });

      expect(buildEntityOverrides).toHaveBeenCalledWith({
        name: 'jane',
        entityId: 'user:jane@acme.com@okta',
      });
    });
  });

  describe('host rows', () => {
    it('displays the entity name from the store record', () => {
      mockUseEntityFromStore.mockReturnValue({
        ...emptyStoreResult,
        entityRecord: {
          entity: { id: 'host:HW-UUID', name: 'server-1' },
          host: { name: 'server-1' },
        },
      });

      renderRow({ entityId: 'host:HW-UUID', entityType: 'host' });

      expect(screen.getByTestId('mock-host-name')).toHaveTextContent('server-1');
      expect(screen.getByTestId('mock-host-entity-id')).toHaveTextContent('host:HW-UUID');
    });

    it('falls back to parsing the EUID when the store record is missing', () => {
      renderRow({ entityId: 'host:HW-UUID', entityType: 'host' });

      expect(screen.getByTestId('mock-host-name')).toHaveTextContent('HW-UUID');
    });
  });

  describe('service rows', () => {
    it('renders a simple name row using the store record entity name', () => {
      mockUseEntityFromStore.mockReturnValue({
        ...emptyStoreResult,
        entityRecord: {
          entity: { id: 'service:payments@prod', name: 'payments' },
        },
      });

      renderRow({ entityId: 'service:payments@prod', entityType: 'service' });

      const row = screen.getByTestId(ATTACK_ENTITIES_TOOL_SERVICE_ROW_TEST_ID);
      expect(row).toHaveTextContent('payments');
      expect(screen.queryByTestId('mock-user-details')).not.toBeInTheDocument();
      expect(screen.queryByTestId('mock-host-details')).not.toBeInTheDocument();
    });
  });
});
