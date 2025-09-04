/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import React from 'react';

import { InfoPopoverBody } from '.';
import { TestProviders } from '../../../../common/mock';
import { AVERAGE_TIME } from '../countdown/translations';

const averageSuccessfulDurationNanoseconds = 191_000_000_000; // 191 seconds

describe('InfoPopoverBody', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the expected average time', () => {
    render(
      <TestProviders>
        <InfoPopoverBody
          averageSuccessfulDurationNanoseconds={averageSuccessfulDurationNanoseconds}
        />
      </TestProviders>
    );

    expect(screen.getByTestId('averageTimeBadge')).toHaveTextContent('191s');
  });

  it('renders the expected explanation', () => {
    render(
      <TestProviders>
        <InfoPopoverBody
          averageSuccessfulDurationNanoseconds={averageSuccessfulDurationNanoseconds}
        />
      </TestProviders>
    );

    expect(screen.getAllByTestId('averageTimeIsCalculated')[0]).toHaveTextContent(AVERAGE_TIME);
  });

  it('rounds up to the next second', () => {
    render(
      <TestProviders>
        <InfoPopoverBody averageSuccessfulDurationNanoseconds={8_500_000_000} />
      </TestProviders>
    );

    expect(screen.getByTestId('averageTimeBadge')).toHaveTextContent('9s');
  });

  it('renders 0s when nanoseconds is undefined', () => {
    render(
      <TestProviders>
        <InfoPopoverBody averageSuccessfulDurationNanoseconds={undefined} />
      </TestProviders>
    );

    expect(screen.getByTestId('averageTimeBadge')).toHaveTextContent('0s');
  });

  it('renders the LastTimesPopover with successfulGenerations', () => {
    render(
      <TestProviders>
        <InfoPopoverBody successfulGenerations={5} />
      </TestProviders>
    );

    expect(screen.getByTestId('lastTimesPopover')).toBeInTheDocument();
  });
});
