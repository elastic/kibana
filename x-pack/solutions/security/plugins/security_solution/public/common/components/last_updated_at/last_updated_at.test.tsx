/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { render } from '@testing-library/react';

import { TestProviders } from '../../mock/test_providers';
import { LastUpdatedAt } from './last_updated_at';

describe('LastUpdatedAt Component', () => {
  it('Should show "updating" text while loading', () => {
    const { getByText } = render(<LastUpdatedAt isUpdating updatedAt={0} />);

    expect(getByText('Updating...')).toBeInTheDocument();
    expect(() => getByText(/Updated/)).toThrow();
  });

  it('should render "updated" text when loaded', () => {
    const { getByText } = render(
      <TestProviders>
        <LastUpdatedAt isUpdating={false} updatedAt={1663024451584} />
      </TestProviders>
    );

    expect(getByText(/Updated/)).toBeInTheDocument();
    expect(() => getByText('Updating...')).toThrow();
  });
});
