/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { AlertProcessingDonut } from './alert_processing_donut';

describe('AlertProcessingDonut', () => {
  const valueMetrics = {
    attackDiscoveryCount: 10,
    filteredAlertsPerc: 80,
    escalatedAlertsPerc: 20,
    hoursSaved: 5,
    costSavings: 1000,
    totalAlerts: 100,
    filteredAlerts: 40,
  };

  it('renders DonutChart with correct props', () => {
    const { getByTestId } = render(<AlertProcessingDonut valueMetrics={valueMetrics} />);

    expect(getByTestId('donut-chart')).toBeInTheDocument();
  });
});
