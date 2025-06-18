/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fireEvent, render } from '@testing-library/react';
import { getOr } from 'lodash/fp';
import React from 'react';
// Necessary until components being tested are migrated of styled-components https://github.com/elastic/kibana/issues/219037
import 'jest-styled-components';

import { TestProviders, createMockStore } from '../../../../common/mock';
import { networkModel } from '../../store';
import { TlsTable } from '.';
import { mockTlsData } from './mock';

jest.mock('../../../../common/lib/kibana');

describe('Tls Table Component', () => {
  const loadPage = jest.fn();
  const defaultProps = {
    data: mockTlsData.edges,
    fakeTotalCount: getOr(50, 'fakeTotalCount', mockTlsData.pageInfo),
    id: 'tls',
    isInspect: false,
    loading: false,
    loadPage,
    setQuerySkip: jest.fn(),
    showMorePagesIndicator: getOr(false, 'showMorePagesIndicator', mockTlsData.pageInfo),
    totalCount: 1,
    type: networkModel.NetworkType.details,
  };
  let store = createMockStore();

  beforeEach(() => {
    store = createMockStore();
  });

  describe('Rendering', () => {
    test('it renders the default Domains table', () => {
      const { container } = render(
        <TestProviders store={store}>
          <TlsTable {...defaultProps} />
        </TestProviders>
      );

      expect(container.children[0]).toMatchSnapshot();
    });
  });

  describe('Sorting on Table', () => {
    test('when you click on the column header, you should show the sorting icon', () => {
      const { container } = render(
        <TestProviders store={store}>
          <TlsTable {...defaultProps} />
        </TestProviders>
      );
      expect(store.getState().network.details.queries?.tls.sort).toEqual({
        direction: 'desc',
        field: '_id',
      });

      fireEvent.click(container.querySelector('.euiTable thead tr th button')!);

      expect(store.getState().network.details.queries?.tls.sort).toEqual({
        direction: 'asc',
        field: '_id',
      });

      expect(container.querySelector('.euiTable thead tr th button')?.textContent).toEqual(
        'SHA1 fingerprint'
      );
    });
  });
});
