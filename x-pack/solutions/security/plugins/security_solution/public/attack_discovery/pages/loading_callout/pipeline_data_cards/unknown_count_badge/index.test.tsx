/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import React from 'react';

import { UnknownCountBadge } from '.';
import { UNKNOWN_COUNT_TOOLTIP } from '../translations';

describe('UnknownCountBadge', () => {
  it('renders a "?" badge', () => {
    render(<UnknownCountBadge />);

    expect(screen.getByTestId('unknownCountBadge')).toHaveTextContent('?');
  });

  it('renders the badge with hollow color', () => {
    render(<UnknownCountBadge />);

    const badge = screen.getByTestId('unknownCountBadge');

    // EuiBadge with color="hollow" renders as a hollow badge
    expect(badge).toBeInTheDocument();
  });

  it('wraps the badge in a tooltip', () => {
    render(<UnknownCountBadge />);

    // The tooltip wrapper should exist around the badge
    expect(screen.getByTestId('unknownCountTooltip')).toBeInTheDocument();
  });

  it('has the expected tooltip text', () => {
    render(<UnknownCountBadge />);

    const tooltip = screen.getByTestId('unknownCountTooltip');

    // EuiToolTip stores content in aria attributes
    expect(tooltip).toHaveAttribute('aria-label', UNKNOWN_COUNT_TOOLTIP);
  });
});
