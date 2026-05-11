/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import {
  EmulationBadge,
  EMULATION_BADGE_TEST_ID,
  EMULATION_BADGE_TOOLTIP_TEST_ID,
} from './emulation_badge';

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

    const badge = screen.getByTestId(EMULATION_BADGE_TEST_ID);
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent('EMULATION');
  });

  it('reveals an accessible tooltip containing the emulation ID on hover', async () => {
    const emulationId = 'test-emulation-456';
    render(<EmulationBadge emulationId={emulationId} />);

    const badge = screen.getByTestId(EMULATION_BADGE_TEST_ID);
    // EuiToolTip's content is rendered into a portal once the trigger is
    // hovered/focused. Triggering both events covers mouse and keyboard users.
    fireEvent.mouseOver(badge);
    fireEvent.focus(badge);

    const tooltip = await waitFor(() => screen.getByTestId(`${EMULATION_BADGE_TOOLTIP_TEST_ID}`));
    expect(tooltip).toBeInTheDocument();
    expect(tooltip.textContent).toContain(emulationId);
  });

  // N8: assert behaviour through the test-subj contract, not via brittle EUI
  // className internals (which churn between EUI versions). The badge exposes
  // a stable `data-test-subj` and that is what consumers rely on.
  it('exposes a stable data-test-subj and is keyboard-focusable', () => {
    render(<EmulationBadge emulationId="test-emulation-789" />);

    const badge = screen.getByTestId(EMULATION_BADGE_TEST_ID);
    expect(badge).toHaveAttribute('data-test-subj', EMULATION_BADGE_TEST_ID);
    expect(badge).toHaveAttribute('tabIndex', '0');
  });
});
