/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { TestProviders } from '../../../common/mock';

import { ExceptionsUtility } from '.';

describe('ExceptionsUtility', () => {
  it('it renders correct item counts', () => {
    const wrapper = render(
      <TestProviders>
        <ExceptionsUtility
          pagination={{
            pageIndex: 0,
            pageSize: 50,
            totalItemCount: 105,
            pageSizeOptions: [5, 10, 20, 50, 100],
          }}
          lastUpdated={1660534202}
          dataTestSubj="exceptionUtility"
        />
      </TestProviders>
    );
    expect(wrapper.getByTestId('exceptionUtilityShowingText')).toHaveTextContent(
      'Showing 1-50 of 105'
    );
  });
  it('it renders last updated message', () => {
    const wrapper = render(
      <TestProviders>
        <ExceptionsUtility
          pagination={{
            pageIndex: 0,
            pageSize: 50,
            totalItemCount: 1,
            pageSizeOptions: [5, 10, 20, 50, 100],
          }}
          lastUpdated={Date.now()}
          dataTestSubj="exceptionUtility"
        />
      </TestProviders>
    );
    expect(wrapper.getByTestId('exceptionUtilityLastUpdated')).toHaveTextContent('Updated now');
  });
});
