/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { screen, render, fireEvent } from '@testing-library/react';
import { getOr } from 'lodash/fp';
import React from 'react';
// Necessary until components being tested are migrated of styled-components https://github.com/elastic/kibana/issues/219037
import 'jest-styled-components';

import { TestProviders, createMockStore } from '../../../../common/mock';
import { networkModel } from '../../store';

import { UsersTable } from '.';
import { mockUsersData } from './mock';
import { FlowTargetSourceDest } from '../../../../../common/search_strategy';

jest.mock('../../../../common/lib/kibana');

describe('Users Table Component', () => {
  const loadPage = jest.fn();

  let store = createMockStore();

  beforeEach(() => {
    store = createMockStore();
  });

  const defaultProps = {
    data: mockUsersData.edges,
    flowTarget: FlowTargetSourceDest.source,
    fakeTotalCount: getOr(50, 'fakeTotalCount', mockUsersData.pageInfo),
    id: 'user',
    isInspect: false,
    loading: false,
    loadPage,
    setQuerySkip: jest.fn(),
    showMorePagesIndicator: getOr(false, 'showMorePagesIndicator', mockUsersData.pageInfo),
    totalCount: 1,
    type: networkModel.NetworkType.details,
  };

  describe('Rendering', () => {
    test('it renders the default Users table', () => {
      render(
        <TestProviders store={store}>
          <UsersTable {...defaultProps} />
        </TestProviders>
      );

      expect(screen.getByTestId('table-users-loading-false')).toMatchSnapshot();
    });
  });

  describe('Sorting on Table', () => {
    test('when you click on the column header, you should show the sorting icon', () => {
      const { container } = render(
        <TestProviders store={store}>
          <UsersTable {...defaultProps} />
        </TestProviders>
      );
      expect(store.getState().network.details.queries?.users.sort).toEqual({
        direction: 'asc',
        field: 'name',
      });

      fireEvent.click(container.querySelector('.euiTable thead tr th button')!);

      expect(store.getState().network.details.queries?.users.sort).toEqual({
        direction: 'desc',
        field: 'name',
      });
      expect(container.querySelector('.euiTable thead tr th button')?.textContent).toEqual('User');
    });
  });
});
