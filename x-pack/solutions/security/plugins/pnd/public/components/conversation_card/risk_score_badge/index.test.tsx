/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';

import { renderWithPndProviders } from '../../test_utils/render_with_pnd_providers';
import { RiskScoreBadge } from '.';

describe('RiskScoreBadge', () => {
  it('renders the score', () => {
    renderWithPndProviders(<RiskScoreBadge score={73} />);

    expect(screen.getByTestId('pndRiskScoreBadge')).toHaveTextContent('73');
  });

  /**
   * A two-digit number on its own is unreadable out of context, and the badge is the only place the
   * score appears on the row.
   */
  it('names what the number is, for a screen reader', () => {
    renderWithPndProviders(<RiskScoreBadge score={73} />);

    expect(screen.getByTestId('pndRiskScoreBadge')).toHaveAttribute('aria-label', 'Risk score 73');
  });

  /**
   * The 2026-08-18 design decision *"Queue score badges as rounded rectangles"* replaced the circle,
   * and the shape is the whole of that decision, so it is pinned here rather than left to review.
   * `50%` would be the circle coming back.
   */
  it('draws the 40px card badge as a rounded rectangle rather than a circle', () => {
    renderWithPndProviders(<RiskScoreBadge score={73} />);

    expect(screen.getByTestId('pndRiskScoreBadge')).toHaveStyle({ borderRadius: '8px' });
  });

  /**
   * A real zero is a legitimate score (D5), and the row — not this badge — decides whether a score
   * exists at all. Rendering nothing here would make "the alerts scored zero" look like "there is
   * no score".
   */
  it('renders a real zero rather than blanking the badge', () => {
    renderWithPndProviders(<RiskScoreBadge score={0} />);

    expect(screen.getByTestId('pndRiskScoreBadge')).toHaveTextContent('0');
  });
});
