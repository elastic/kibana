/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { EmptyCellValue, EntityCell, EntityNameCell } from './entity_table_cells';
import { NO_VALUE_LABEL } from './translations';

const DATE_FORMAT = 'YYYY-MM-DD';

const renderCell = (props: Partial<React.ComponentProps<typeof EntityCell>>) =>
  render(
    <EntityCell
      value="value"
      kind="attribute"
      isBadge={false}
      dateFormat={DATE_FORMAT}
      {...props}
    />
  );

describe('EmptyCellValue', () => {
  it('shows a dash to sighted users and "No value" to screen readers', () => {
    render(<EmptyCellValue />);

    expect(screen.getByText('—')).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getByText(NO_VALUE_LABEL)).toBeInTheDocument();
  });
});

describe('EntityNameCell', () => {
  it('shows the entity name', () => {
    render(<EntityNameCell name="web-001" iconType="compute" />);

    expect(screen.getByText('web-001')).toBeInTheDocument();
  });

  it('shows the placeholder when the entity has no name', () => {
    render(<EntityNameCell name={null} iconType="compute" />);

    expect(screen.getByText(NO_VALUE_LABEL)).toBeInTheDocument();
  });
});

describe('EntityCell', () => {
  it('formats a last seen value with the date format', () => {
    const { container } = renderCell({ kind: 'last_seen', value: '2026-10-30T12:00:00.000Z' });

    expect(container).toHaveTextContent(/^2026-10-30$/);
  });

  it('shows an attribute as plain text', () => {
    renderCell({ value: 'ubuntu' });

    expect(screen.getByText('ubuntu')).toBeInTheDocument();
    expect(screen.queryByTestId('entityInventoryCellBadge')).not.toBeInTheDocument();
  });

  it('joins the values of a multi-value attribute', () => {
    renderCell({ value: ['10.0.0.1', 'fe80::1'] });

    expect(screen.getByText('10.0.0.1, fe80::1')).toBeInTheDocument();
  });

  it.each([null, undefined, []])('shows the placeholder for the empty value %p', (value) => {
    renderCell({ value });

    expect(screen.getByText(NO_VALUE_LABEL)).toBeInTheDocument();
  });

  it('shows a badge when the column is a badge column', () => {
    renderCell({ value: 'prod-cluster-0', isBadge: true });

    expect(screen.getByTestId('entityInventoryCellBadge')).toHaveTextContent('prod-cluster-0');
  });

  it('does not show a badge around the placeholder', () => {
    const { container } = renderCell({ value: null, isBadge: true });

    expect(within(container).queryByTestId('entityInventoryCellBadge')).not.toBeInTheDocument();
    expect(screen.getByText(NO_VALUE_LABEL)).toBeInTheDocument();
  });
});
