/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
// Necessary until components being tested are migrated of styled-components https://github.com/elastic/kibana/issues/219037
import 'jest-styled-components';
import { render } from '@testing-library/react';

import { TestProviders, createMockStore } from '../../../../common/mock';
import { networkModel } from '../../store';
import { NetworkTopNFlowTable } from '.';
import { mockData, mockCount } from './mock';
import { FlowTargetSourceDest } from '../../../../../common/search_strategy';

jest.mock('../../../../common/lib/kibana');
jest.mock('../../../../common/components/link_to');

describe('NetworkTopNFlow Table Component', () => {
  const loadPage = jest.fn();
  let store = createMockStore();
  const defaultProps = {
    data: mockData.edges,
    fakeTotalCount: 50,
    flowTargeted: FlowTargetSourceDest.source,
    id: 'topNFlowSource',
    isInspect: false,
    loading: false,
    loadPage,
    setQuerySkip: jest.fn(),
    showMorePagesIndicator: true,
    totalCount: mockCount.totalCount,
    type: networkModel.NetworkType.page,
  };

  beforeEach(() => {
    store = createMockStore();
  });

  describe('rendering', () => {
    test('it renders the default NetworkTopNFlow table on the Network page', () => {
      const { container } = render(
        <TestProviders store={store}>
          <NetworkTopNFlowTable {...defaultProps} />
        </TestProviders>
      );

      expect(container.children[0]).toMatchSnapshot();
    });

    test('it renders the default NetworkTopNFlow table on the IP Details page', () => {
      const { container } = render(
        <TestProviders store={store}>
          <NetworkTopNFlowTable {...defaultProps} type={networkModel.NetworkType.details} />
        </TestProviders>
      );

      expect(container.children[0]).toMatchSnapshot();
    });
  });
});
