/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, render, screen } from '@testing-library/react';

import { CreatedBy } from './created_info';
import { TestProviders } from '../../../../../../common/mock';

const renderComponent = async (
  createdBy = 'test',
  createdAt = new Date().toISOString(),
  dataTestId = 'testComponent'
) => {
  await act(() => {
    render(
      <TestProviders>
        {<CreatedBy createdBy={createdBy} createdAt={createdAt} data-test-subj={dataTestId} />}
      </TestProviders>
    );
  });
};

describe('CreatedBy', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render component', async () => {
    await renderComponent();

    expect(screen.getByTestId('testComponent')).toBeInTheDocument();
  });

  it('should render create by message', async () => {
    await renderComponent('elastic', '2025-04-17T11:54:13.531Z', 'createByContainer');

    expect(screen.getByTestId('createByContainer')).toHaveTextContent(
      'Created by: elastic on Apr 17, 2025 @ 11:54:13.531'
    );
  });
});
