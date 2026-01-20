/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { I18nProvider } from '@kbn/i18n-react';
import type { SLOWithSummaryResponse } from '@kbn/slo-schema';
import { HealthCallout } from './health_callout';
import { useFetchSloHealth } from '../../../../hooks/use_fetch_slo_health';

jest.mock('../../../../hooks/use_fetch_slo_health');

const mockUseFetchSloHealth = useFetchSloHealth as jest.Mock;

const mockSlo1: SLOWithSummaryResponse = {
  id: '1',
  name: 'Test SLO 1',
  revision: 1,
  budgetingMethod: 'occurrences',
  objective: { target: 0.99 },
  timeWindow: { duration: '30d', type: 'rolling' },
  indicator: {
    type: 'sli.kql.custom',
    params: {
      index: 'test-index',
      good: 'status: 200',
      total: '*',
    },
  },
  summary: {
    sliValue: 0.95,
    errorBudget: {
      initial: 0.01,
      consumed: 0.5,
      remaining: 0.5,
    },
    status: 'HEALTHY',
  },
} as SLOWithSummaryResponse;

const mockSlo2: SLOWithSummaryResponse = {
  ...mockSlo1,
  id: '2',
  name: 'Test SLO 2',
} as SLOWithSummaryResponse;

describe('HealthCallout', () => {
  it('should render unhealthy message when an unhealthy rollup transform is present', () => {
    mockUseFetchSloHealth.mockReturnValue({
      data: [
        {
          sloId: '1',
          health: { overall: 'unhealthy', rollup: 'unhealthy', summary: 'healthy' },
        },
      ],
    });

    render(
      <I18nProvider>
        <HealthCallout sloList={[mockSlo1]} />
      </I18nProvider>
    );
    fireEvent.click(screen.getByText(/Some SLOs are unhealthy/));
    expect(screen.getByTestId('sloHealthCalloutDescription').textContent).toBe(
      'The following SLO is in an unhealthy state. Data may be missing or incomplete. You can inspect it here:'
    );
  });

  it('should render unhealthy message when an unhealthy summary transform is present', () => {
    mockUseFetchSloHealth.mockReturnValue({
      data: [
        {
          sloId: '1',
          health: { overall: 'unhealthy', rollup: 'healthy', summary: 'unhealthy' },
        },
      ],
    });

    render(
      <I18nProvider>
        <HealthCallout sloList={[mockSlo1]} />
      </I18nProvider>
    );
    fireEvent.click(screen.getByText(/Some SLOs are unhealthy/));
    expect(screen.getByTestId('sloHealthCalloutDescription').textContent).toBe(
      'The following SLO is in an unhealthy state. Data may be missing or incomplete. You can inspect it here:'
    );
  });

  it('should render unhealthy message when a missing rollup transform is present', () => {
    mockUseFetchSloHealth.mockReturnValue({
      data: [
        {
          sloId: '1',
          health: { overall: 'unhealthy', rollup: 'missing', summary: 'healthy' },
        },
      ],
    });

    render(
      <I18nProvider>
        <HealthCallout sloList={[mockSlo1]} />
      </I18nProvider>
    );
    fireEvent.click(screen.getByText(/Some SLOs are unhealthy/));
    expect(screen.getByTestId('sloHealthCalloutDescription').textContent).toBe(
      'The following SLO is in an unhealthy state. Data may be missing or incomplete. You can inspect it here:'
    );
  });

  it('should render unhealthy message when a missing summary transform is present', () => {
    mockUseFetchSloHealth.mockReturnValue({
      data: [
        {
          sloId: '1',
          health: { overall: 'unhealthy', rollup: 'healthy', summary: 'missing' },
        },
      ],
    });

    render(
      <I18nProvider>
        <HealthCallout sloList={[mockSlo1]} />
      </I18nProvider>
    );
    fireEvent.click(screen.getByText(/Some SLOs are unhealthy/));
    expect(screen.getByTestId('sloHealthCalloutDescription').textContent).toBe(
      'The following SLO is in an unhealthy state. Data may be missing or incomplete. You can inspect it here:'
    );
  });

  it('should not render if all SLOs are healthy', () => {
    mockUseFetchSloHealth.mockReturnValue({
      data: [
        {
          sloId: '1',
          health: { overall: 'healthy', rollup: 'healthy', summary: 'healthy' },
        },
      ],
    });

    render(
      <I18nProvider>
        <HealthCallout sloList={[mockSlo1]} />
      </I18nProvider>
    );
    // The callout should not be present when all SLOs are healthy
    expect(screen.queryByText(/Some SLOs are unhealthy/)).toBeNull();
  });

  it('should list all unhealthy SLOs', () => {
    mockUseFetchSloHealth.mockReturnValue({
      data: [
        {
          sloId: '1',
          health: { overall: 'unhealthy', rollup: 'healthy', summary: 'unhealthy' },
        },
        {
          sloId: '2',
          health: { overall: 'unhealthy', rollup: 'unhealthy', summary: 'healthy' },
        },
      ],
    });

    render(
      <I18nProvider>
        <HealthCallout sloList={[mockSlo1, mockSlo2]} />
      </I18nProvider>
    );

    fireEvent.click(screen.getByText(/Some SLOs are unhealthy/));
    expect(screen.getByTestId('sloHealthCalloutDescription').textContent).toBe(
      'The following SLOs are in an unhealthy state. Data may be missing or incomplete. You can inspect each one here:'
    );
  });
});
