/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MonitorTypeBadge } from './monitor_type_badge';

describe('MonitorTypeBadge', () => {
  it('renders the visible badge title for a browser monitor', () => {
    render(<MonitorTypeBadge monitorType="browser" />);
    expect(screen.getByText('Journey')).toBeInTheDocument();
  });

  it('does not override the accessible name when the badge is not clickable', () => {
    render(<MonitorTypeBadge monitorType="browser" ariaLabel="Click to filter records." />);
    // The visible text stays the accessible name; the prop is only a tooltip.
    expect(screen.queryByLabelText('Click to filter records.')).not.toBeInTheDocument();
    expect(screen.getByTitle('Click to filter records.')).toBeInTheDocument();
  });

  it('announces the visible badge text before the filter instructions', () => {
    render(
      <MonitorTypeBadge
        monitorType="browser"
        ariaLabel="Click to filter records for type browser."
        onClick={jest.fn()}
      />
    );

    expect(
      screen.getByRole('button', {
        name: 'Journey, Click to filter records for type browser.',
      })
    ).toBeInTheDocument();
  });

  it('falls back to its own filter instructions when no ariaLabel is given', () => {
    render(<MonitorTypeBadge monitorType="http" onClick={jest.fn()} />);

    expect(
      screen.getByRole('button', {
        name: 'HTTP, Click to filter monitors for type: HTTP',
      })
    ).toBeInTheDocument();
  });

  it('calls onClick when the badge is activated', async () => {
    const onClick = jest.fn();
    render(<MonitorTypeBadge monitorType="browser" onClick={onClick} />);

    await userEvent.click(screen.getByRole('button'));

    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
