/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import { ALL_VALUE } from '@kbn/slo-schema';
import React from 'react';
import {
  buildApmAvailabilityIndicator,
  buildApmLatencyIndicator,
} from '../../../../data/slo/indicator';
import { buildSlo } from '../../../../data/slo/slo';
import { ApmIndicatorOverview } from './apm_indicator_overview';

jest.mock('../../../../hooks/use_kibana', () => ({
  useKibana: () => ({
    services: { http: { basePath: { prepend: (url: string) => `/s/test${url}` } } },
  }),
}));

describe('ApmIndicatorOverview', () => {
  it.each([buildApmLatencyIndicator(), buildApmAvailabilityIndicator()])(
    'shows source badges and links for $type',
    (indicator) => {
      render(<ApmIndicatorOverview slo={buildSlo({ indicator })} />);

      expect(screen.getByText('APM source')).toBeVisible();
      const serviceLink = screen.getByRole('link', { name: 'service: o11y-app' });
      expect(screen.getByRole('link', { name: 'environment: development' })).toBeVisible();
      expect(screen.getByRole('link', { name: 'transactionType: request' })).toBeVisible();
      expect(
        screen.getByRole('link', { name: `transactionName: ${indicator.params.transactionName}` })
      ).toBeVisible();

      const href = serviceLink.getAttribute('href');
      const url = new URL(String(href), 'https://kibana.example');
      expect(url.pathname).toBe('/s/test/app/apm/services/o11y-app/overview');
      expect(url.searchParams.get('environment')).toBe('development');
      expect(url.searchParams.get('transactionType')).toBe('request');
      expect(url.searchParams.get('kuery')).toBe(
        `transaction.name : "${indicator.params.transactionName}"`
      );
      for (const link of screen.getAllByRole('link')) {
        expect(link).toHaveAttribute('href', href);
      }
    }
  );

  it('omits badges for wildcard values', () => {
    const indicator = buildApmLatencyIndicator({
      environment: ALL_VALUE,
      transactionType: ALL_VALUE,
      transactionName: ALL_VALUE,
    });

    render(<ApmIndicatorOverview slo={buildSlo({ indicator })} />);

    expect(screen.getByRole('link', { name: 'service: o11y-app' })).toBeVisible();
    expect(screen.getAllByRole('link')).toHaveLength(1);
  });

  it('does not render for a non-APM indicator', () => {
    const { container } = render(<ApmIndicatorOverview slo={buildSlo()} />);

    expect(container).toBeEmptyDOMElement();
  });
});
