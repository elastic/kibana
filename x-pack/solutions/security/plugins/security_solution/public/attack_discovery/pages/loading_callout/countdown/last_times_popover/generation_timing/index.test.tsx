/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import React from 'react';

import { TestProviders } from '../../../../../../common/mock';
import { GenerationTiming } from '.';

describe('GenerationTiming', () => {
  const interval = {
    connectorId: 'claudeV3SonnetUsEast1',
    date: '2024-04-15T13:48:44.397Z',
    durationMs: 5000,
  };

  beforeEach(() => {
    render(
      <TestProviders>
        <GenerationTiming interval={interval} />
      </TestProviders>
    );
  });

  it('renders the expected duration in seconds', () => {
    const durationText = screen.getByTestId('clockBadge').textContent;

    expect(durationText).toEqual('5s');
  });

  it('displays the expected date', () => {
    const date = screen.getByTestId('date').textContent;

    expect(date).toEqual('Apr 15, 2024 @ 13:48:44.397');
  });
});
