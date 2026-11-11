/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { EmptyCellValue, EntityCell } from './entity_table_cells';
import { NO_VALUE_LABEL } from './translations';

const DATE_FORMAT = 'YYYY-MM-DD';

const renderCell = (props: Partial<React.ComponentProps<typeof EntityCell>>) =>
  render(<EntityCell value="value" kind="attribute" dateFormat={DATE_FORMAT} {...props} />);

describe('EmptyCellValue', () => {
  it('shows a dash to sighted users and "No value" to screen readers', () => {
    render(<EmptyCellValue />);

    expect(screen.getByText('—')).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getByText(NO_VALUE_LABEL)).toBeInTheDocument();
  });
});

describe('EntityCell', () => {
  it('formats a last seen value with the date format', () => {
    const { container } = renderCell({ kind: 'last_seen', value: '2026-10-30T12:00:00.000Z' });

    expect(container).toHaveTextContent(/^2026-10-30$/);
  });

  it('shows the placeholder for a last seen cell without a value', () => {
    renderCell({ kind: 'last_seen', value: null });

    expect(screen.getByText(NO_VALUE_LABEL)).toBeInTheDocument();
  });

  it.each(['id', 'identity', 'attribute', undefined] as const)(
    'shows a %s cell as plain text',
    (kind) => {
      const { container } = renderCell({ kind, value: '2026-10-30T12:00:00.000Z' });

      expect(container).toHaveTextContent(/^2026-10-30T12:00:00.000Z$/);
    }
  );

  it('joins the values of a multi-value attribute', () => {
    renderCell({ value: ['10.0.0.1', 'fe80::1'] });

    expect(screen.getByText('10.0.0.1, fe80::1')).toBeInTheDocument();
  });

  it.each([null, undefined, []])('shows the placeholder for the empty value %p', (value) => {
    renderCell({ value });

    expect(screen.getByText(NO_VALUE_LABEL)).toBeInTheDocument();
  });
});
