/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { LabeledBadgeTable } from './labeled_badge_table';

describe('LabeledBadgeTable', () => {
  it('renders one row per input with its label and values', () => {
    render(
      <LabeledBadgeTable
        caption="Test table"
        rows={[
          { id: 'ip', label: 'ip', values: <span>203.0.113.4</span> },
          { id: 'hash', label: 'hash', values: <span>abc123</span> },
        ]}
      />
    );

    expect(screen.getByText('ip')).toBeInTheDocument();
    expect(screen.getByText('203.0.113.4')).toBeInTheDocument();
    expect(screen.getByText('hash')).toBeInTheDocument();
    expect(screen.getByText('abc123')).toBeInTheDocument();
  });

  it('accepts a caption prop without throwing', () => {
    expect(() =>
      render(
        <LabeledBadgeTable
          caption="My custom caption"
          rows={[{ id: 'ip', label: 'ip', values: <span>203.0.113.4</span> }]}
        />
      )
    ).not.toThrow();
  });
});
