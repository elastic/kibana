/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import type { RunQuotasResponse } from '@kbn/significant-events-plugin/common';
import { useRunQuotas } from '../../data/run_quotas/use_significant_events_run_quotas';
import { RunLimitsBanner } from './run_limits_banner';

jest.mock('../../data/run_quotas/use_significant_events_run_quotas');
jest.mock('../../data/maintenance/use_significant_events_maintenance', () => ({
  useBlocksNewActivity: () => ({ isBlocked: false }),
}));

const mockUseRunQuotas = useRunQuotas as jest.MockedFunction<typeof useRunQuotas>;

const response = (overrides: Partial<RunQuotasResponse> = {}): RunQuotasResponse => ({
  enabled: true,
  limits: {
    detection: 100,
    investigation: 30,
    ki_extraction: 0,
  },
  counts: {
    detection: 100,
    investigation: 5,
    ki_extraction: 500,
  },
  window: {
    start: '2026-09-03T00:00:00.000Z',
    resetsAt: '2026-09-04T00:00:00.000Z',
    timezone: 'UTC',
  },
  canManage: true,
  ...overrides,
});

describe('RunLimitsBanner', () => {
  it('shows the Discovery message without unrelated reached limits', () => {
    mockUseRunQuotas.mockReturnValue({
      data: response({
        limits: {
          detection: 100,
          investigation: 5,
          ki_extraction: 500,
        },
        counts: {
          detection: 100,
          investigation: 5,
          ki_extraction: 500,
        },
      }),
    } as ReturnType<typeof useRunQuotas>);

    render(
      <I18nProvider>
        <RunLimitsBanner />
      </I18nProvider>
    );

    const callout = screen.getByTestId('nightshiftRunQuotaReached-detection');
    expect(callout).toHaveTextContent('Discovery reached daily run limit of 100 for this deployment');
    expect(callout).toHaveTextContent(
      'Further scheduled runs will be paused until the limit resets at midnight (UTC). You can still trigger discovery process manually.'
    );
    expect(callout).not.toHaveTextContent('Investigation');
    expect(callout).not.toHaveTextContent('Knowledge indicators extraction');
  });

  it('stays hidden when only another quota group has reached its limit', () => {
    mockUseRunQuotas.mockReturnValue({
      data: response({
        limits: {
          detection: 101,
          investigation: 5,
          ki_extraction: 500,
        },
      }),
    } as ReturnType<typeof useRunQuotas>);

    render(
      <I18nProvider>
        <RunLimitsBanner />
      </I18nProvider>
    );

    expect(screen.queryByTestId('nightshiftRunQuotaReached-detection')).not.toBeInTheDocument();
  });
});
