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
import { KnowledgeIndicatorsTab } from './tab';

jest.mock('../../data/run_quotas/use_significant_events_run_quotas');
jest.mock('../../data/maintenance/use_significant_events_maintenance', () => ({
  useBlocksNewActivity: () => ({ isBlocked: false }),
}));
jest.mock('./knowledge_indicators_table', () => ({
  KnowledgeIndicatorsTable: () => <div data-test-subj="knowledgeIndicatorsTableStub" />,
}));

const mockUseRunQuotas = useRunQuotas as jest.MockedFunction<typeof useRunQuotas>;

const response = (kiExtractionLimit: number): RunQuotasResponse => ({
  enabled: true,
  limits: {
    detection: 3,
    investigation: 1,
    ki_extraction: kiExtractionLimit,
  },
  counts: {
    detection: 3,
    investigation: 1,
    ki_extraction: 2,
  },
  window: {
    start: '2026-10-27T00:00:00.000Z',
    resetsAt: '2026-10-28T00:00:00.000Z',
    timezone: 'UTC',
  },
  canManage: true,
});

const renderTab = () =>
  render(
    <I18nProvider>
      <KnowledgeIndicatorsTab />
    </I18nProvider>
  );

describe('KnowledgeIndicatorsTab', () => {
  it('shows only the knowledge indicator extraction limit message', () => {
    mockUseRunQuotas.mockReturnValue({
      data: response(2),
    } as ReturnType<typeof useRunQuotas>);

    renderTab();

    const callout = screen.getByTestId('nightshiftRunQuotaReached-ki_extraction');
    expect(callout).toHaveTextContent(
      'Knowledge indicators extraction reached daily run limit of 2 for this deployment'
    );
    expect(callout).toHaveTextContent(
      'Further scheduled runs will be paused until the limit resets at midnight (UTC). You can still trigger discovery process manually.'
    );
    expect(callout).not.toHaveTextContent('Discovery reached');
    expect(callout).not.toHaveTextContent('Investigation');
    expect(screen.getByTestId('knowledgeIndicatorsTableStub')).toBeInTheDocument();
  });

  it('stays hidden before the knowledge indicator extraction limit is reached', () => {
    mockUseRunQuotas.mockReturnValue({
      data: response(3),
    } as ReturnType<typeof useRunQuotas>);

    renderTab();

    expect(screen.queryByTestId('nightshiftRunQuotaReached-ki_extraction')).not.toBeInTheDocument();
  });
});
