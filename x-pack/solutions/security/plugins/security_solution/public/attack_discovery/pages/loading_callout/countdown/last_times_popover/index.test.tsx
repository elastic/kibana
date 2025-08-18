/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GenerationInterval } from '@kbn/elastic-assistant-common';
import { render, screen, cleanup } from '@testing-library/react';
import React from 'react';

import { LastTimesPopover } from '.';
import { TestProviders } from '../../../../../common/mock';
import { useKibanaFeatureFlags } from '../../../use_kibana_feature_flags';

jest.mock('../../../use_kibana_feature_flags');

describe('LastTimesPopover', () => {
  const connectorIntervals: GenerationInterval[] = [
    {
      date: '2024-05-16T14:13:09.838Z',
      durationMs: 173648,
    },
    {
      date: '2024-05-16T13:59:49.620Z',
      durationMs: 146605,
    },
    {
      date: '2024-05-16T13:47:00.629Z',
      durationMs: 255163,
    },
  ];

  beforeEach(() => {
    (useKibanaFeatureFlags as jest.Mock).mockReturnValue({
      attackDiscoveryAlertsEnabled: false,
    });

    render(
      <TestProviders>
        <LastTimesPopover connectorIntervals={connectorIntervals} />
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

  it('renders generation timing for each connector interval', () => {
    const generationTimings = screen.getAllByTestId('generationTiming');
    expect(generationTimings.length).toEqual(connectorIntervals.length);

    const expectedDates = [
      'May 16, 2024 @ 14:13:09.838',
      'May 16, 2024 @ 13:59:49.620',
      'May 16, 2024 @ 13:47:00.629',
    ];

    generationTimings.forEach((timing, i) => expect(timing).toHaveTextContent(expectedDates[i]));
  });

  it('renders the average time calculated message with successfulGenerations', () => {
    (useKibanaFeatureFlags as jest.Mock).mockReturnValue({
      attackDiscoveryAlertsEnabled: true,
    });
    render(
      <TestProviders>
        <LastTimesPopover connectorIntervals={connectorIntervals} successfulGenerations={5} />
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
    (useKibanaFeatureFlags as jest.Mock).mockReturnValue({
      attackDiscoveryAlertsEnabled: true,
    });
    render(
      <TestProviders>
        <LastTimesPopover connectorIntervals={connectorIntervals} />
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
