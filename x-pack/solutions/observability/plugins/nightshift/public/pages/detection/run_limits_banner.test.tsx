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
import { useKibana } from '../../hooks/use_kibana';
import { getRunQuotaSettingsTab, RunLimitsBanner } from './run_limits_banner';

jest.mock('../../hooks/use_kibana');
jest.mock('../../data/run_quotas/use_significant_events_run_quotas');
jest.mock('../../data/maintenance/use_significant_events_maintenance', () => ({
  useBlocksNewActivity: () => ({ isBlocked: false }),
}));

const mockUseKibana = useKibana as jest.MockedFunction<typeof useKibana>;
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
  beforeEach(() => {
    mockUseKibana.mockReturnValue({
      services: {
        application: {
          getUrlForApp: (appId: string, { path }: { path: string }) => `/app/${appId}${path}`,
        },
      },
    } as never);
  });

  it('maps exhausted groups to the tab that owns their settings', () => {
    expect(getRunQuotaSettingsTab(['investigation'])).toBe('investigations');
    expect(getRunQuotaSettingsTab(['detection'])).toBe('detections');
    expect(getRunQuotaSettingsTab(['investigation', 'ki_extraction'])).toBe('detections');
  });

  it('shows read-only wording and no link to a viewer', () => {
    mockUseRunQuotas.mockReturnValue({
      data: response({ canManage: false }),
    } as ReturnType<typeof useRunQuotas>);

    render(
      <I18nProvider>
        <RunLimitsBanner />
      </I18nProvider>
    );

    expect(screen.getByTestId('nightshiftDetectionRunLimitsBanner')).toHaveTextContent(
      'An administrator with the Nightshift Manage engines privilege can change these limits.'
    );
    expect(
      screen.queryByTestId('nightshiftDetectionRunLimitsBannerReviewButton')
    ).not.toBeInTheDocument();
  });
});
