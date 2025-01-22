/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { TestProviders } from '../../../../common/mock';

import { UsersTable } from '.';
import { usersModel } from '../../store';
import { Direction, RiskSeverity } from '../../../../../common/search_strategy';
import { UsersFields } from '../../../../../common/search_strategy/security_solution/users/common';
import { render } from '@testing-library/react';

const mockUseMlCapabilities = jest.fn().mockReturnValue({ isPlatinumOrTrialLicense: false });

jest.mock('../../../../common/components/ml/hooks/use_ml_capabilities', () => ({
  useMlCapabilities: () => mockUseMlCapabilities(),
}));

describe('Users Table Component', () => {
  const loadPage = jest.fn();

  describe('rendering', () => {
    test('it renders the users table', () => {
      const userName = 'testUser';
      const { getByTestId, getAllByRole, getByText } = render(
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
      expect(getAllByRole('columnheader').length).toBe(4);
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

    test('it renders "Host Risk classfication" column when "isPlatinumOrTrialLicense" is truthy', () => {
      mockUseMlCapabilities.mockReturnValue({ isPlatinumOrTrialLicense: true });

      const { getAllByRole, getByText } = render(
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

      expect(getAllByRole('columnheader').length).toBe(5);
      expect(getByText('Critical')).toBeInTheDocument();
    });

    test("it doesn't renders 'Host Risk classfication' column when 'isPlatinumOrTrialLicense' is falsy", () => {
      mockUseMlCapabilities.mockReturnValue({ isPlatinumOrTrialLicense: false });

      const { getAllByRole, queryByText } = render(
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

      expect(getAllByRole('columnheader').length).toBe(4);
      expect(queryByText('Critical')).not.toBeInTheDocument();
    });
  });
});
