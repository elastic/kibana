/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { EmulationBadge } from './emulation_badge';

describe('EmulationBadge', () => {
  it('renders nothing when emulationId is undefined', () => {
    const { container } = render(<EmulationBadge />);
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when emulationId is empty string', () => {
    const { container } = render(<EmulationBadge emulationId="" />);
    expect(container.firstChild).toBeNull();
  });

  it('renders badge when emulationId is provided', () => {
    render(<EmulationBadge emulationId="test-emulation-123" />);

    const badge = screen.getByTestId('emulation-badge');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent('EMULATION');
  });

  it('includes emulation ID in tooltip', () => {
    const emulationId = 'test-emulation-456';
    render(<EmulationBadge emulationId={emulationId} />);

    const badge = screen.getByTestId('emulation-badge');
    expect(badge).toHaveAttribute('title');
    expect(badge.getAttribute('title')).toContain(emulationId);
  });

  it('applies hollow color styling', () => {
    render(<EmulationBadge emulationId="test-emulation-789" />);

    const badge = screen.getByTestId('emulation-badge');
    expect(badge.className).toContain('hollow');
  });
});
