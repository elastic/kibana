/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, render, screen } from '@testing-library/react';

import { UpdatedBy } from './updated_info';
import { TestProviders } from '../../../../../../common/mock';

const renderComponent = async (
  updatedBy = 'test',
  updatedAt = new Date().toISOString(),
  dataTestId = 'testComponent'
) => {
  await act(() => {
    render(
      <TestProviders>
        {<UpdatedBy updatedBy={updatedBy} updatedAt={updatedAt} data-test-subj={dataTestId} />}
      </TestProviders>
    );
  });
};

describe('UpdatedBy', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render component', async () => {
    await renderComponent();

    expect(screen.getByTestId('testComponent')).toBeInTheDocument();
  });

  it('should render updated by message', async () => {
    await renderComponent('elastic', '2025-04-17T11:54:13.531Z', 'updatedByContainer');

    expect(screen.getByTestId('updatedByContainer')).toHaveTextContent(
      'Updated by: elastic on Apr 17, 2025 @ 11:54:13.531'
    );
  });
});
