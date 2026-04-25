/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen, cleanup } from '@testing-library/react';
import React from 'react';

import { LastTimesPopover } from '.';
import { TestProviders } from '../../../../../common/mock';

describe('LastTimesPopover', () => {
  beforeEach(() => {
    render(
      <TestProviders>
        <LastTimesPopover successfulGenerations={3} />
      </TestProviders>
    );
  });
  afterEach(cleanup);

  it('renders average time calculated message', () => {
    const averageTimeIsCalculated = screen.getByTestId('averageTimeIsCalculated');

    expect(averageTimeIsCalculated).toHaveTextContent(
      'Remaining time is based on the average speed of the last 3 times the same connector generated results.'
    );
  });

  it('renders the average time calculated message with successfulGenerations', () => {
    render(
      <TestProviders>
        <LastTimesPopover successfulGenerations={5} />
      </TestProviders>
    );
    const averageTimeIsCalculated = screen.getAllByTestId('averageTimeIsCalculated');

    expect(
      averageTimeIsCalculated.some(
        (el) =>
          el.textContent ===
          'Remaining time is based on the average speed of the last 5 times the same connector generated results.'
      )
    ).toBe(true);
  });

  it('renders the average time calculated message with zero when successfulGenerations is undefined', () => {
    render(
      <TestProviders>
        <LastTimesPopover />
      </TestProviders>
    );
    const averageTimeIsCalculated = screen.getAllByTestId('averageTimeIsCalculated');

    expect(
      averageTimeIsCalculated.some(
        (el) =>
          el.textContent ===
          'Remaining time is based on the average speed of the last 0 times the same connector generated results.'
      )
    ).toBe(true);
  });
});
