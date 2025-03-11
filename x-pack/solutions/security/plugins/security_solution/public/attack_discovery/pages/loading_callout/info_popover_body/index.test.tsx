/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GenerationInterval } from '@kbn/elastic-assistant-common';
import { render, screen } from '@testing-library/react';
import React from 'react';

import { InfoPopoverBody } from '.';
import { TestProviders } from '../../../../common/mock';
import { AVERAGE_TIME } from '../countdown/translations';

describe('InfoPopoverBody', () => {
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

  it('renders the expected average time', () => {
    render(
      <TestProviders>
        <InfoPopoverBody connectorIntervals={connectorIntervals} />
      </TestProviders>
    );

    const averageTimeBadge = screen.getByTestId('averageTimeBadge');

    expect(averageTimeBadge).toHaveTextContent('191s');
  });

  it('renders the expected explanation', () => {
    render(
      <TestProviders>
        <InfoPopoverBody connectorIntervals={connectorIntervals} />
      </TestProviders>
    );

    const averageTimeIsCalculated = screen.getAllByTestId('averageTimeIsCalculated');

    expect(averageTimeIsCalculated[0]).toHaveTextContent(AVERAGE_TIME);
  });
});
