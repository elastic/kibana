/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import React from 'react';

import { TestProviders } from '../../../../common/mock';

import { UsersTable } from '.';
import { usersModel } from '../../store';
import { Direction, RiskSeverity } from '../../../../../common/search_strategy';
import { UsersFields } from '../../../../../common/search_strategy/security_solution/users/common';
import { fireEvent, render } from '@testing-library/react';
import { FLYOUT_ORIGIN } from '../../../../common/lib/telemetry';

const mockUseMlCapabilities = vi.fn().mockReturnValue({ isPlatinumOrTrialLicense: false });

vi.mock('../../../../common/components/ml/hooks/use_ml_capabilities', () => {
      const mocked = {
      useMlCapabilities: () => mockUseMlCapabilities(),
    };
      return { ...mocked, default: mocked };
    });

const mockOpenUserFlyout = vi.fn();
const mockOpenFlyout = vi.fn();

vi.mock('@kbn/expandable-flyout', () => {
      const mocked = {
      useExpandableFlyoutApi: () => ({ openFlyout: mockOpenFlyout, closeFlyout: vi.fn() }),
    };
      return { ...mocked, default: mocked };
    });
vi.mock('../../../../common/hooks/use_is_new_flyout_enabled', () => {
      const mocked = {
      useIsNewFlyoutEnabled: () => true,
    };
      return { ...mocked, default: mocked };
    });
vi.mock('../../../../flyout_v2/use_flyout_api', () => {
      const mocked = {
      useFlyoutApi: () => ({
        openUserFlyout: mockOpenUserFlyout,
        openHostFlyout: vi.fn(),
        openServiceFlyout: vi.fn(),
        openGenericEntityFlyout: vi.fn(),
      }),
    };
      return { ...mocked, default: mocked };
    });

describe('Users Table Component', () => {
  const loadPage = vi.fn();

  beforeEach(() => {
    mockOpenUserFlyout.mockClear();
    mockOpenFlyout.mockClear();
  });

  describe('rendering', () => {
    test('it renders the users table', () => {
      const userName = 'testUser';
      const { getByTestId, getAllByTestId, getByText } = render(
        <TestProviders>
          <UsersTable
            users={[
              { name: userName, lastSeen: '2019-04-08T18:35:45.064Z', domain: 'test domain' },
            ]}
            fakeTotalCount={50}
            id="users"
            loading={false}
            loadPage={loadPage}
            showMorePagesIndicator={false}
            totalCount={0}
            type={usersModel.UsersType.page}
            sort={{
              field: UsersFields.name,
              direction: Direction.asc,
            }}
            setQuerySkip={() => {}}
          />
        </TestProviders>
      );

      expect(getByTestId('table-allUsers-loading-false')).toBeInTheDocument();
      expect(getAllByTestId(/tableHeaderCell_/).length).toBe(4);
      expect(getByText(userName)).toBeInTheDocument();
    });

    test('it renders empty string token when users name is empty', () => {
      const { getByTestId } = render(
        <TestProviders>
          <UsersTable
            users={[{ name: '', lastSeen: '2019-04-08T18:35:45.064Z', domain: 'test domain' }]}
            fakeTotalCount={50}
            id="users"
            loading={false}
            loadPage={loadPage}
            showMorePagesIndicator={false}
            totalCount={0}
            type={usersModel.UsersType.page}
            sort={{
              field: UsersFields.name,
              direction: Direction.asc,
            }}
            setQuerySkip={() => {}}
          />
        </TestProviders>
      );

      expect(getByTestId('table-allUsers-loading-false')).toHaveTextContent('(Empty string)');
    });

    test('it renders "Host Risk classification" column when "isPlatinumOrTrialLicense" is truthy', () => {
      mockUseMlCapabilities.mockReturnValue({ isPlatinumOrTrialLicense: true });

      const { getAllByTestId, getByText } = render(
        <TestProviders>
          <UsersTable
            users={[
              {
                name: 'testUser',
                lastSeen: '2019-04-08T18:35:45.064Z',
                domain: 'test domain',
                risk: RiskSeverity.Critical,
              },
            ]}
            fakeTotalCount={50}
            id="users"
            loading={false}
            loadPage={loadPage}
            showMorePagesIndicator={false}
            totalCount={0}
            type={usersModel.UsersType.page}
            sort={{
              field: UsersFields.name,
              direction: Direction.asc,
            }}
            setQuerySkip={() => {}}
          />
        </TestProviders>
      );

      expect(getAllByTestId(/tableHeaderCell_/).length).toBe(5);
      expect(getByText('Critical')).toBeInTheDocument();
    });

    test("it doesn't renders 'Host Risk classfication' column when 'isPlatinumOrTrialLicense' is falsy", () => {
      mockUseMlCapabilities.mockReturnValue({ isPlatinumOrTrialLicense: false });

      const { getAllByTestId, queryByText } = render(
        <TestProviders>
          <UsersTable
            users={[
              {
                name: 'testUser',
                lastSeen: '2019-04-08T18:35:45.064Z',
                domain: 'test domain',
                risk: RiskSeverity.Critical,
              },
            ]}
            fakeTotalCount={50}
            id="users"
            loading={false}
            loadPage={loadPage}
            showMorePagesIndicator={false}
            totalCount={0}
            type={usersModel.UsersType.page}
            sort={{
              field: UsersFields.name,
              direction: Direction.asc,
            }}
            setQuerySkip={() => {}}
          />
        </TestProviders>
      );

      expect(getAllByTestId(/tableHeaderCell_/).length).toBe(4);
      expect(queryByText('Critical')).not.toBeInTheDocument();
    });

    test('opens the user flyout when clicking a user name that has an entityId', () => {
      const userName = 'testUser';
      const entityId = 'test-entity-id';

      const { getByTestId } = render(
        <TestProviders>
          <UsersTable
            users={[
              {
                name: userName,
                lastSeen: '2019-04-08T18:35:45.064Z',
                domain: 'test domain',
                entityId,
              },
            ]}
            fakeTotalCount={50}
            id="users"
            loading={false}
            loadPage={loadPage}
            showMorePagesIndicator={false}
            totalCount={0}
            type={usersModel.UsersType.page}
            sort={{
              field: UsersFields.name,
              direction: Direction.asc,
            }}
            setQuerySkip={() => {}}
          />
        </TestProviders>
      );

      fireEvent.click(getByTestId('users-link-anchor'));

      expect(mockOpenUserFlyout).toHaveBeenCalledWith({
        userName,
        entityId,
        contextID: 'allUsers',
        scopeId: 'allUsers',
        origin: FLYOUT_ORIGIN.USERS_TABLE,
      });
    });

    test('does not open the flyout when clicking a user name without an entityId', () => {
      const { getByTestId } = render(
        <TestProviders>
          <UsersTable
            users={[
              {
                name: 'testUser',
                lastSeen: '2019-04-08T18:35:45.064Z',
                domain: 'test domain',
              },
            ]}
            fakeTotalCount={50}
            id="users"
            loading={false}
            loadPage={loadPage}
            showMorePagesIndicator={false}
            totalCount={0}
            type={usersModel.UsersType.page}
            sort={{
              field: UsersFields.name,
              direction: Direction.asc,
            }}
            setQuerySkip={() => {}}
          />
        </TestProviders>
      );

      fireEvent.click(getByTestId('users-link-anchor'));

      expect(mockOpenUserFlyout).not.toHaveBeenCalled();
      expect(mockOpenFlyout).not.toHaveBeenCalled();
    });
  });
});
