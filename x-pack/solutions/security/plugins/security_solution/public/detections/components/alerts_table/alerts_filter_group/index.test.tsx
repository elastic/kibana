/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { AlertsTableFilterGroup } from '.';

describe('AlertsTableFilterGroup', () => {
  it('renders the status options with the current status selected', () => {
    render(<AlertsTableFilterGroup status={'open'} onFilterGroupChanged={jest.fn()} />);

    expect(screen.getByTestId('alerts-table-filter-group')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Acknowledged' })).toHaveAttribute(
      'aria-pressed',
      'false'
    );
    expect(screen.getByRole('button', { name: 'Closed' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('calls onFilterGroupChanged with the selected status', async () => {
    const onFilterGroupChanged = jest.fn();
    render(<AlertsTableFilterGroup status={'open'} onFilterGroupChanged={onFilterGroupChanged} />);

    await userEvent.click(screen.getByRole('button', { name: 'Closed' }));

    expect(onFilterGroupChanged).toHaveBeenCalledWith('closed');
  });
});
