/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, within } from '@testing-library/react';
import GoToAction from './go_to_action';

describe('GoToAction', () => {
  it('renders the button with correct props when state is valid', () => {
    const state = {
      type: 'discoverSession',
      url: {
        pathAndQuery: '/app/discover#/',
        label: 'Discover session',
        actionLabel: 'Go to Discover',
        iconType: 'discoverApp',
      },
    };

    render(<GoToAction state={state} />);
    const button = screen.getByTestId('cases-go-to-action');

    expect(button).toBeInTheDocument();
    expect(within(button).getByText('Go to Discover')).toBeInTheDocument();
    expect(button).toHaveAttribute('href', '/app/discover#/');
    expect(button).toHaveAttribute('aria-label', 'Go to Discover');
    expect(button).toHaveAttribute('data-test-subj', 'cases-go-to-action');
  });

  it('returns null when href or actionLabel is missing', () => {
    const state = {
      url: {
        pathAndQuery: null,
        label: 'Discover session',
        actionLabel: 'actionLabel',
      },
      iconType: 'discoverApp',
      type: 'discoverSession',
      screenContext: null,
    };

    // @ts-ignore next line
    render(<GoToAction state={state} />);
    expect(screen.queryByText('actionLabel')).not.toBeInTheDocument();
  });
});
