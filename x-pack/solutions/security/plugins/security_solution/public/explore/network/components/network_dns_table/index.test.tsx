/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import { getOr } from 'lodash/fp';
import React from 'react';
// Necessary until components being tested are migrated of styled-components https://github.com/elastic/kibana/issues/219037
import 'jest-styled-components';

import { TestProviders, createMockStore } from '../../../../common/mock';
import { networkModel } from '../../store';

import { NetworkDnsTable } from '.';
import { mockData } from './mock';

jest.mock('../../../../common/lib/kibana');

describe('NetworkTopNFlow Table Component', () => {
  const loadPage = jest.fn();
  let store = createMockStore();

  const defaultProps = {
    data: mockData.edges,
    fakeTotalCount: getOr(50, 'fakeTotalCount', mockData.pageInfo),
    id: 'dns',
    isInspect: false,
    loading: false,
    loadPage,
    setQuerySkip: jest.fn(),
    showMorePagesIndicator: getOr(false, 'showMorePagesIndicator', mockData.pageInfo),
    totalCount: mockData.totalCount,
    type: networkModel.NetworkType.page,
  };

  beforeEach(() => {
    store = createMockStore();
  });

  describe('rendering', () => {
    test('it renders the default NetworkTopNFlow table', () => {
      render(
        <TestProviders store={store}>
          <NetworkDnsTable {...defaultProps} />
        </TestProviders>
      );

      expect(screen.getByTestId('table-dns-loading-false')).toMatchSnapshot();
    });
  });
});
