/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import { getOr } from 'lodash/fp';
import React from 'react';
// Necessary until components being tested are migrated of styled-components https://github.com/elastic/kibana/issues/219037
import 'jest-styled-components';

import { FlowTargetSourceDest } from '../../../../../common/search_strategy/security_solution/network';
import { mockIndexPattern, createMockStore, TestProviders } from '../../../../common/mock';
import { networkModel } from '../../store';

import { NetworkTopCountriesTable } from '.';
import { mockData } from './mock';

jest.mock('../../../../common/lib/kibana');

describe('NetworkTopCountries Table Component', () => {
  const loadPage = jest.fn();
  const defaultProps = {
    data: mockData.NetworkTopCountries.edges,
    fakeTotalCount: getOr(50, 'fakeTotalCount', mockData.NetworkTopCountries.pageInfo),
    flowTargeted: FlowTargetSourceDest.source,
    id: 'topCountriesSource',
    indexPattern: mockIndexPattern,
    isInspect: false,
    loading: false,
    loadPage,
    setQuerySkip: jest.fn(),
    showMorePagesIndicator: getOr(
      false,
      'showMorePagesIndicator',
      mockData.NetworkTopCountries.pageInfo
    ),
    totalCount: mockData.NetworkTopCountries.totalCount,
    type: networkModel.NetworkType.page,
  };

  let store = createMockStore();

  beforeEach(() => {
    store = createMockStore();
  });

  describe('rendering', () => {
    test('it renders the default NetworkTopCountries table', () => {
      const { container } = render(
        <TestProviders store={store}>
          <NetworkTopCountriesTable {...defaultProps} />
        </TestProviders>
      );

      expect(container.children[0]).toMatchSnapshot();
    });
    test('it renders the IP Details NetworkTopCountries table', () => {
      const { container } = render(
        <TestProviders store={store}>
          <NetworkTopCountriesTable {...defaultProps} type={networkModel.NetworkType.details} />
        </TestProviders>
      );

      expect(container.children[0]).toMatchSnapshot();
    });
  });
});
