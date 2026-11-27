/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import { ALL_VALUE } from '@kbn/slo-schema';
import { render } from '../../../../utils/test_helper';
import { buildSlo } from '../../../../data/slo/slo';
import {
  buildApmAvailabilityIndicator,
  buildApmLatencyIndicator,
  buildCustomKqlIndicator,
} from '../../../../data/slo/indicator';
import { ApmIndicatorOverview } from './apm_indicator_overview';

describe('ApmIndicatorOverview', () => {
  it.each([
    ['availability', buildApmAvailabilityIndicator(), 'GET /flaky'],
    ['latency', buildApmLatencyIndicator(), 'GET /slow'],
  ])('renders the APM source badges for an APM %s SLO', (_, indicator, transactionName) => {
    render(<ApmIndicatorOverview slo={buildSlo({ indicator })} />);

    expect(screen.getByText('APM source')).toBeInTheDocument();
    expect(screen.getByText('service: o11y-app')).toBeInTheDocument();
    expect(screen.getByText('environment: development')).toBeInTheDocument();
    expect(screen.getByText('transactionType: request')).toBeInTheDocument();
    expect(screen.getByText(`transactionName: ${transactionName}`)).toBeInTheDocument();
  });

  it('omits badges for params set to ALL_VALUE', () => {
    const slo = buildSlo({
      indicator: buildApmLatencyIndicator({
        environment: ALL_VALUE,
        transactionType: ALL_VALUE,
        transactionName: ALL_VALUE,
      }),
    });
    render(<ApmIndicatorOverview slo={slo} />);

    expect(screen.getByText('service: o11y-app')).toBeInTheDocument();
    expect(screen.queryByText(/^environment:/)).not.toBeInTheDocument();
    expect(screen.queryByText(/^transactionType:/)).not.toBeInTheDocument();
    expect(screen.queryByText(/^transactionName:/)).not.toBeInTheDocument();
  });

  it('renders nothing for a non-APM SLO', () => {
    render(<ApmIndicatorOverview slo={buildSlo({ indicator: buildCustomKqlIndicator() })} />);

    expect(screen.queryByText('APM source')).not.toBeInTheDocument();
  });
});
