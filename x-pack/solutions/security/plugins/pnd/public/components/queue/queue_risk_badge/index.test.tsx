/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';

import { renderWithPndProviders } from '../../test_utils/render_with_pnd_providers';
import { QueueRiskBadge } from '.';

describe('QueueRiskBadge', () => {
  it('renders the score', () => {
    renderWithPndProviders(<QueueRiskBadge score={94} />);

    expect(screen.getByTestId('pndQueueRiskScoreBadge')).toHaveTextContent('94');
  });

  it('names what the number is, for a screen reader', () => {
    renderWithPndProviders(<QueueRiskBadge score={94} />);

    expect(screen.getByTestId('pndQueueRiskScoreBadge')).toHaveAttribute(
      'aria-label',
      'Risk score 94'
    );
  });

  it('draws the 40px card badge as a rounded rectangle rather than a circle', () => {
    renderWithPndProviders(<QueueRiskBadge score={94} />);

    expect(screen.getByTestId('pndQueueRiskScoreBadge')).toHaveStyle({ borderRadius: '8px' });
  });

  it('draws the compact child badge as a circle', () => {
    renderWithPndProviders(<QueueRiskBadge score={94} size="s" />);

    expect(screen.getByTestId('pndQueueRiskScoreBadge')).toHaveStyle({ borderRadius: '50%' });
  });

  it('draws the related-conversation badge as a circle too', () => {
    renderWithPndProviders(<QueueRiskBadge score={94} size="ms" />);

    expect(screen.getByTestId('pndQueueRiskScoreBadge')).toHaveStyle({ borderRadius: '50%' });
  });

  it('renders a real zero rather than blanking the badge', () => {
    renderWithPndProviders(<QueueRiskBadge score={0} />);

    expect(screen.getByTestId('pndQueueRiskScoreBadge')).toHaveTextContent('0');
  });
});
