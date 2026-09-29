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
import { TestProviders } from '../../../../common/mock';

import { useQueryToggle } from '../../../../common/containers/query_toggle';
import { useAllEntityStoreUsers } from '../../containers/users/use_all_entity_store_users';
import { AllUsersQueryTabBody } from './all_users_query_tab_body';
import { UsersType } from '../../store/model';

vi.mock('../../containers/users/use_all_entity_store_users');
vi.mock('../../../../common/containers/query_toggle');
vi.mock('../../../../common/lib/kibana');

const mockSearch = vi.fn();

vi.mock('../../../../common/containers/use_search_strategy', async () => {
  const original = (await vi.importActual('../../../../common/containers/use_search_strategy'));
  return {
    ...original,
    useSearchStrategy: () => ({
      search: mockSearch,
      loading: false,
      inspect: {
        dsl: [],
        response: [],
      },
      result: {
        users: [],
        totalCount: 0,
        pageInfo: { activePage: 1, fakeTotalCount: 100, showMorePagesIndicator: false },
      },
      refetch: vi.fn(),
    }),
  };
});

describe('All users query tab body', () => {
  const mockUseAllEntityStoreUsers = useAllEntityStoreUsers as Mock;
  const mockUseQueryToggle = useQueryToggle as Mock;
  const defaultProps = {
    skip: false,
    indexNames: [],
    setQuery: vi.fn(),
    startDate: '2019-06-25T04:31:59.345Z',
    endDate: '2019-06-25T06:31:59.345Z',
    type: UsersType.page,
  };

  const emptyUsersArgs = {
    users: [],
    id: 'UsersTable',
    inspect: {
      dsl: [],
      response: [],
    },
    isInspected: false,
    totalCount: 0,
    pageInfo: { activePage: 0, fakeTotalCount: 50, showMorePagesIndicator: false },
    loadPage: vi.fn(),
    refetch: vi.fn(),
    startDate: defaultProps.startDate,
    endDate: defaultProps.endDate,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAllEntityStoreUsers.mockReturnValue([false, emptyUsersArgs]);
  });

  it('calls search when toggleStatus=true and entity store v2 is disabled', () => {
    mockUseQueryToggle.mockReturnValue({ toggleStatus: true, setToggleStatus: vi.fn() });
    render(
      <TestProviders>
        <AllUsersQueryTabBody {...defaultProps} />
      </TestProviders>
    );
    expect(mockSearch).toHaveBeenCalled();
    expect(mockUseAllEntityStoreUsers.mock.calls[0][0].skip).toEqual(true);
  });

  it("doesn't call search when toggleStatus=false", () => {
    mockUseQueryToggle.mockReturnValue({ toggleStatus: false, setToggleStatus: vi.fn() });
    render(
      <TestProviders>
        <AllUsersQueryTabBody {...defaultProps} />
      </TestProviders>
    );
    expect(mockSearch).not.toHaveBeenCalled();
    expect(mockUseAllEntityStoreUsers.mock.calls[0][0].skip).toEqual(true);
  });
});
