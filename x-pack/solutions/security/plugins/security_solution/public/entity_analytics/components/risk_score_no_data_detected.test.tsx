/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import React from 'react';
import { RiskScoresNoDataDetected } from './risk_score_no_data_detected';
import { TestProviders } from '../../common/mock';
import { EntityType } from '../../../common/search_strategy';

describe('RiskScoresNoDataDetected', () => {
  it('renders no data detected message for host entity', () => {
    render(
      <TestProviders>
        <RiskScoresNoDataDetected entityType={EntityType.host} />
      </TestProviders>
    );

    expect(screen.getByTestId('host-risk-score-no-data-detected')).toBeInTheDocument();
    expect(screen.getByText(/No host risk score data available to display/i)).toBeInTheDocument();
  });

  it('renders no data detected message for user entity', () => {
    render(
      <TestProviders>
        <RiskScoresNoDataDetected entityType={EntityType.user} />
      </TestProviders>
    );

    expect(screen.getByTestId('user-risk-score-no-data-detected')).toBeInTheDocument();
    expect(screen.getByText(/No user risk score data available to display/i)).toBeInTheDocument();
  });

  it('renders helpful message about checking filters and risk engine timing', () => {
    const { container } = render(
      <TestProviders>
        <RiskScoresNoDataDetected entityType={EntityType.host} />
      </TestProviders>
    );

    // The body text is rendered as a single block in EuiEmptyPrompt
    const bodyText = container.textContent || '';
    // Check for key phrases in the message (using more flexible matching)
    expect(bodyText).toMatch(/haven.*found.*host.*risk.*score.*data/i);
    expect(bodyText).toMatch(/Check.*global.*filters/i);
    expect(bodyText).toMatch(/risk.*engine.*might.*need.*hour/i);
  });
});
