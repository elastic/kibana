/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import { ALL_VALUE } from '@kbn/slo-schema';
import { useKibana } from '../../../../hooks/use_kibana';
import { render } from '../../../../utils/test_helper';
import { buildSlo } from '../../../../data/slo/slo';
import {
  buildApmAvailabilityIndicator,
  buildApmLatencyIndicator,
  buildCustomKqlIndicator,
} from '../../../../data/slo/indicator';
import { ApmIndicatorOverview } from './apm_indicator_overview';

jest.mock('../../../../hooks/use_kibana');

const useKibanaMock = useKibana as jest.Mock;

describe('ApmIndicatorOverview', () => {
  beforeEach(() => {
    useKibanaMock.mockReturnValue({
      services: { http: { basePath: { prepend: (url: string) => `/base${url}` } } },
    });
  });

  it('renders the APM source badges for an APM availability SLO', () => {
    const slo = buildSlo({ indicator: buildApmAvailabilityIndicator() });
    render(<ApmIndicatorOverview slo={slo} />);

    expect(screen.getByText('APM source')).toBeTruthy();
    expect(screen.getByText('service: o11y-app')).toBeTruthy();
    expect(screen.getByText('environment: development')).toBeTruthy();
    expect(screen.getByText('transactionType: request')).toBeTruthy();
    expect(screen.getByText('transactionName: GET /flaky')).toBeTruthy();
  });

  it('renders the APM source badges for an APM latency SLO', () => {
    const slo = buildSlo({ indicator: buildApmLatencyIndicator() });
    render(<ApmIndicatorOverview slo={slo} />);

    expect(screen.getByText('service: o11y-app')).toBeTruthy();
    expect(screen.getByText('transactionName: GET /slow')).toBeTruthy();
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

    expect(screen.getByText('service: o11y-app')).toBeTruthy();
    expect(screen.queryByText(/^environment:/)).toBeNull();
    expect(screen.queryByText(/^transactionType:/)).toBeNull();
    expect(screen.queryByText(/^transactionName:/)).toBeNull();
  });

  it('renders nothing for a non-APM SLO', () => {
    const slo = buildSlo({ indicator: buildCustomKqlIndicator() });
    const { container } = render(<ApmIndicatorOverview slo={slo} />);

    expect(container).toBeEmptyDOMElement();
  });
});
