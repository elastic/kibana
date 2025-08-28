/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { act, render, screen } from '@testing-library/react';
import React from 'react';

import { Countdown } from '.';
import { TestProviders } from '../../../../common/mock';
import { INFORMATION } from '../translations';
import { APPROXIMATE_TIME_REMAINING } from './translations';

describe('Countdown', () => {
  beforeAll(() => {
    jest.useFakeTimers();
  });

  beforeEach(() => {
    jest.clearAllTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it('renders the expected prefix', () => {
    const approximateFutureTime = moment().add(1, 'minute').toDate();

    render(
      <TestProviders>
        <Countdown approximateFutureTime={approximateFutureTime} />
      </TestProviders>
    );

    expect(screen.getByTestId('prefix')).toHaveTextContent(APPROXIMATE_TIME_REMAINING);
  });

  it('renders the expected the timer text', () => {
    const approximateFutureTime = moment().add(1, 'minute').toDate();

    render(
      <TestProviders>
        <Countdown approximateFutureTime={approximateFutureTime} />
      </TestProviders>
    );

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(screen.getByTestId('timerText')).toHaveTextContent('00:59');
  });

  it('renders an accessible information button icon', async () => {
    const approximateFutureTime = moment().add(1, 'minute').toDate();

    await act(async () => {
      render(
        <TestProviders>
          <Countdown approximateFutureTime={approximateFutureTime} />
        </TestProviders>
      );
    });

    expect(screen.getByRole('button', { name: INFORMATION })).toBeInTheDocument();
  });

  it('returns null when approximateFutureTime is null', () => {
    const { container } = render(
      <TestProviders>
        <Countdown approximateFutureTime={null} />
      </TestProviders>
    );

    expect(container.innerHTML).toEqual('');
  });
});
