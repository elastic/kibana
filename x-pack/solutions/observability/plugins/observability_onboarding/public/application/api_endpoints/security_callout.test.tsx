/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { SecurityCallout } from './security_callout';

describe('SecurityCallout', () => {
  const defaultProps = {
    wasKeyCreatedBefore: true,
    hasApiKey: false,
    isDismissed: false,
    onDismiss: jest.fn(),
  };

  it('renders the title and body when a key was created before', () => {
    render(<SecurityCallout {...defaultProps} />);

    expect(screen.getByText("Your existing keys can't be displayed")).toBeInTheDocument();
    expect(
      screen.getByText(/For security, API keys are shown only once, right after you create them/)
    ).toBeInTheDocument();
  });

  it('renders nothing when no key was ever created', () => {
    render(<SecurityCallout {...defaultProps} wasKeyCreatedBefore={false} />);

    expect(
      screen.queryByTestId('observabilityOnboardingApiEndpointsSecurityCallout')
    ).not.toBeInTheDocument();
  });

  it('renders nothing when a key is in memory', () => {
    render(<SecurityCallout {...defaultProps} hasApiKey={true} />);

    expect(
      screen.queryByTestId('observabilityOnboardingApiEndpointsSecurityCallout')
    ).not.toBeInTheDocument();
  });

  it('renders nothing when dismissed', () => {
    render(<SecurityCallout {...defaultProps} isDismissed={true} />);

    expect(
      screen.queryByTestId('observabilityOnboardingApiEndpointsSecurityCallout')
    ).not.toBeInTheDocument();
  });

  it('calls onDismiss when the dismiss button is clicked', async () => {
    const onDismiss = jest.fn();
    render(<SecurityCallout {...defaultProps} onDismiss={onDismiss} />);

    await userEvent.click(screen.getByTestId('euiDismissCalloutButton'));

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
