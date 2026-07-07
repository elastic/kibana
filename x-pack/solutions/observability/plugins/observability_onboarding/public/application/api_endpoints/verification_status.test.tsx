/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { VerificationStatus } from './verification_status';

describe('VerificationStatus', () => {
  it('shows the waiting message when detection is active', () => {
    render(<VerificationStatus status="waiting" detectionActive endpointLabel="Elasticsearch" />);
    expect(screen.getByTestId('obltOnboardingVerificationWaiting')).toBeInTheDocument();
  });

  it('shows the unavailable message when detection is not active', () => {
    render(
      <VerificationStatus status="waiting" detectionActive={false} endpointLabel="Elasticsearch" />
    );
    expect(screen.getByTestId('obltOnboardingVerificationUnavailable')).toBeInTheDocument();
  });

  it('shows the accepted message with the endpoint label', () => {
    render(<VerificationStatus status="accepted" detectionActive endpointLabel="Elasticsearch" />);
    expect(screen.getByTestId('obltOnboardingVerificationAccepted')).toHaveTextContent(
      'Elasticsearch'
    );
  });

  it('shows the expired message', () => {
    render(<VerificationStatus status="expired" detectionActive endpointLabel="Elasticsearch" />);
    expect(screen.getByTestId('obltOnboardingVerificationExpired')).toBeInTheDocument();
  });
});
