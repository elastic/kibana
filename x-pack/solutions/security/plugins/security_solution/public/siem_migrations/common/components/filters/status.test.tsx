/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { StatusFilterButton } from './status';

describe('StatusFilterButton', () => {
  const onStatusChanged = jest.fn();
  const statusFilterOptions = [
    {
      label: 'All',
      data: {
        status: 'all',
      },
    },
    {
      label: 'Active',
      data: {
        status: 'active',
      },
    },
  ];

  it('renders the button', () => {
    const { getByTestId } = render(
      <StatusFilterButton
        onStatusChanged={onStatusChanged}
        statusFilterOptions={statusFilterOptions}
      />
    );
    expect(getByTestId('statusFilterButton')).toBeInTheDocument();
  });

  it('opens the popover when the button is clicked', async () => {
    const { getByTestId } = render(
      <StatusFilterButton
        onStatusChanged={onStatusChanged}
        statusFilterOptions={statusFilterOptions}
      />
    );

    fireEvent.click(getByTestId('statusFilterButton'));

    await waitFor(() => {
      expect(getByTestId('statusFilterSelectableList')).toBeInTheDocument();
    });
  });

  it('calls onStatusChanged when an option is selected', async () => {
    const { getByTestId, getByText } = render(
      <StatusFilterButton
        onStatusChanged={onStatusChanged}
        statusFilterOptions={statusFilterOptions}
      />
    );

    fireEvent.click(getByTestId('statusFilterButton'));
    fireEvent.click(getByText('Active'));

    await waitFor(() => {
      expect(onStatusChanged).toHaveBeenCalledWith('active');
    });
  });
});
