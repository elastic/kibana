/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { RiskScoreCell } from './risk_score_cell';
import { TestProviders } from '../../../../common/mock';

const renderRiskScoreCell = (riskScore?: number) =>
  render(
    <TestProviders>
      <RiskScoreCell riskScore={riskScore} />
    </TestProviders>
  );

describe('RiskScoreCell', () => {
  it('renders empty tag value when riskScore is undefined', () => {
    const { container } = renderRiskScoreCell(undefined);

    expect(container.querySelector('.euiBadge')).not.toBeInTheDocument();
    expect(container.textContent).toBe('—');
  });

  it('renders empty tag value when riskScore is null', () => {
    const { container } = render(
      <TestProviders>
        <RiskScoreCell riskScore={null as unknown as undefined} />
      </TestProviders>
    );

    expect(container.querySelector('.euiBadge')).not.toBeInTheDocument();
    expect(container.textContent).toBe('—');
  });

  it('renders formatted score inside an EuiBadge for a valid score', () => {
    const { container } = renderRiskScoreCell(55.123);

    expect(container.querySelector('.euiBadge')).toBeInTheDocument();
    expect(container.textContent).toBe('55.12');
  });

  it.each([
    { score: 10, expectedText: '10.00' },
    { score: 25, expectedText: '25.00' },
    { score: 55, expectedText: '55.00' },
    { score: 80, expectedText: '80.00' },
    { score: 95, expectedText: '95.00' },
  ])('renders badge with score $score formatted as $expectedText', ({ score, expectedText }) => {
    const { container } = renderRiskScoreCell(score);

    expect(container.querySelector('.euiBadge')).toBeInTheDocument();
    expect(container.textContent).toBe(expectedText);
  });
});
