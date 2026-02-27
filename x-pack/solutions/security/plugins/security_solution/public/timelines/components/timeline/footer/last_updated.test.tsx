/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { LastUpdatedContainer } from './last_updated';
import { TestProviders } from '../../../../common/mock/test_providers';

describe('LastUpdateContainer', () => {
  it('should return the last updated time', () => {
    render(
      <TestProviders>
        <LastUpdatedContainer updatedAt={Date.now()} />
      </TestProviders>
    );
    expect(screen.getByTestId('last-updated-container')).toBeInTheDocument();
  });

  it('should not return the last updated time for invalid values', () => {
    render(
      <TestProviders>
        <LastUpdatedContainer updatedAt={0} />
      </TestProviders>
    );
    expect(screen.queryByTestId('last-updated-container')).not.toBeInTheDocument();
  });
});
