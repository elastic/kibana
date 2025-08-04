/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { AlertProcessingCompare } from './alert_processing_compare';
import type { ValueMetrics } from './metrics';

const baseMetrics: ValueMetrics = {
  attackDiscoveryCount: 10,
  filteredAlerts: 80,
  filteredAlertsPerc: 80,
  escalatedAlertsPerc: 20,
  hoursSaved: 5,
  totalAlerts: 100,
  costSavings: 1000,
};

describe('AlertProcessingCompare', () => {
  it('renders compare section when all values are non-zero', () => {
    const { getByTestId } = render(
      <AlertProcessingCompare valueMetrics={baseMetrics} valueMetricsCompare={baseMetrics} />
    );
    expect(getByTestId('alertProcessingCompare')).toBeInTheDocument();
    expect(getByTestId('alertProcessingCompareTitle')).toBeInTheDocument();
    expect(getByTestId('alertProcessingCompareFilteringRate')).toBeInTheDocument();
    expect(getByTestId('alertProcessingCompareNonSuspiciousLabel')).toBeInTheDocument();
    expect(getByTestId('alertProcessingCompareEscalatedRate')).toBeInTheDocument();
    expect(getByTestId('alertProcessingCompareEscalatedLabel')).toBeInTheDocument();
  });

  it('does not render if filteredAlertsPerc is 0', () => {
    const metrics = { ...baseMetrics, filteredAlertsPerc: 0 };
    const { queryByTestId } = render(
      <AlertProcessingCompare valueMetrics={metrics} valueMetricsCompare={baseMetrics} />
    );
    expect(queryByTestId('alertProcessingCompare')).toBeNull();
  });

  it('does not render if escalatedAlertsPerc is 0', () => {
    const metrics = { ...baseMetrics, escalatedAlertsPerc: 0 };
    const { queryByTestId } = render(
      <AlertProcessingCompare valueMetrics={metrics} valueMetricsCompare={baseMetrics} />
    );
    expect(queryByTestId('alertProcessingCompare')).toBeNull();
  });

  it('does not render if filteredAlertsPerc in compare is 0', () => {
    const metricsCompare = { ...baseMetrics, filteredAlertsPerc: 0 };
    const { queryByTestId } = render(
      <AlertProcessingCompare valueMetrics={baseMetrics} valueMetricsCompare={metricsCompare} />
    );
    expect(queryByTestId('alertProcessingCompare')).toBeNull();
  });

  it('does not render if escalatedAlertsPerc in compare is 0', () => {
    const metricsCompare = { ...baseMetrics, escalatedAlertsPerc: 0 };
    const { queryByTestId } = render(
      <AlertProcessingCompare valueMetrics={baseMetrics} valueMetricsCompare={metricsCompare} />
    );
    expect(queryByTestId('alertProcessingCompare')).toBeNull();
  });
});
