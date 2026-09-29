/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import React from 'react';
import { render } from '@testing-library/react';
// Necessary until components being tested are migrated of styled-components https://github.com/elastic/kibana/issues/219037
import 'jest-styled-components';

import { TestProviders } from '../../../common/mock';
import { useAuthentications } from '../../containers/authentications';
import { useQueryToggle } from '../../../common/containers/query_toggle';
import { AuthenticationsUserTable } from './authentications_user_table';
import { usersModel } from '../../users/store';
import { AuthStackByField } from '../../../../common/search_strategy';

vi.mock('../../../common/containers/query_toggle', () => {
      const mocked = {
      useQueryToggle: vi.fn().mockReturnValue({ toggleStatus: true, setToggleStatus: vi.fn() }),
    };
      return { ...mocked, default: mocked };
    });
vi.mock('../../containers/authentications', () => {
      const mocked = {
      useAuthentications: vi.fn().mockReturnValue([
        false,
        {
          authentications: [],
          totalCount: 0,
          pageInfo: {},
          loadPage: vi.fn(),
          inspect: {},
          isInspected: false,
          refetch: vi.fn(),
        },
      ]),
    };
      return { ...mocked, default: mocked };
    });

describe('Authentication User Table Component', () => {
  const mockUseAuthentications = useAuthentications as Mock;
  const mockUseQueryToggle = useQueryToggle as Mock;

  const startDate = '2020-07-07T08:20:18.966Z';
  const endDate = '3000-01-01T00:00:00.000Z';
  const defaultProps = {
    type: usersModel.UsersType.page,
    startDate,
    endDate,
    skip: false,
    setQuery: vi.fn(),
    indexNames: [],
  };

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    test('it renders the user authentication table', () => {
      const { getByTestId } = render(
        <TestProviders>
          <AuthenticationsUserTable {...defaultProps} />
        </TestProviders>
      );

      expect(getByTestId('table-users-authentications-loading-false')).toMatchSnapshot();
    });
  });

  it('toggleStatus=true, do not skip', () => {
    render(
      <TestProviders>
        <AuthenticationsUserTable {...defaultProps} />
      </TestProviders>
    );
    expect(mockUseAuthentications.mock.calls[0][0].skip).toEqual(false);
  });

  it('toggleStatus=false, skip', () => {
    mockUseQueryToggle.mockReturnValue({ toggleStatus: false, setToggleStatus: vi.fn() });
    render(
      <TestProviders>
        <AuthenticationsUserTable {...defaultProps} />
      </TestProviders>
    );
    expect(mockUseAuthentications.mock.calls[0][0].skip).toEqual(true);
  });

  describe('useAuthentications', () => {
    it('calls useAuthentications stacked by username when username is undefined', () => {
      render(
        <TestProviders>
          <AuthenticationsUserTable {...defaultProps} userName={undefined} />
        </TestProviders>
      );
      expect(mockUseAuthentications.mock.calls[0][0].stackByField).toEqual(
        AuthStackByField.userName
      );
    });

    it('calls useAuthentications stacked by hostname when there username is defined', () => {
      render(
        <TestProviders>
          <AuthenticationsUserTable {...defaultProps} userName={'test username'} />
        </TestProviders>
      );
      expect(mockUseAuthentications.mock.calls[0][0].stackByField).toEqual(
        AuthStackByField.hostName
      );
    });
  });
});
