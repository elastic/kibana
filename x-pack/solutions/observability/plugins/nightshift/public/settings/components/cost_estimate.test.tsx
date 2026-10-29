/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import type {
  BudgetGroupCost,
  CostCaveat,
  CostResponse,
  CostStatus,
  PeriodCost,
  RunQuotasResponse,
} from '@kbn/significant-events-plugin/common';
import { useSignificantEventsCost } from '../hooks/use_significant_events_cost';
import { useRunQuotas } from '../../data/run_quotas/use_significant_events_run_quotas';
import { CostEstimate } from './cost_estimate';
import type { TokenTrackingForm } from './use_token_tracking_form';

jest.mock('../hooks/use_significant_events_cost');
jest.mock('../../data/run_quotas/use_significant_events_run_quotas');

const mockUseSignificantEventsCost = useSignificantEventsCost as jest.MockedFunction<
  typeof useSignificantEventsCost
>;
const mockUseRunQuotas = useRunQuotas as jest.MockedFunction<typeof useRunQuotas>;

const refreshCost = jest.fn();
const retryCost = jest.fn();
const updateTokenTracking = jest.fn();
const cancelTokenTracking = jest.fn();
const saveTokenTracking = jest.fn();
let tokenTracking: TokenTrackingForm;

const quotasResponse = (): RunQuotasResponse => ({
  enabled: true,
  limits: { detection: 1, investigation: 1, ki_extraction: 1 },
  counts: { detection: 0, investigation: 0, ki_extraction: 0 },
  window: {
    start: '2026-09-09T00:00:00.000Z',
    resetsAt: '2026-09-10T00:00:00.000Z',
    timezone: 'UTC',
  },
  canManage: true,
});

const group = (
  name: BudgetGroupCost['group'],
  overrides: Partial<BudgetGroupCost> = {}
): BudgetGroupCost => ({
  group: name,
  status: 'complete',
  estimatedCost: 1,
  totalTokens: 10,
  priceableTokens: 10,
  unpriceableTokens: 0,
  tierCrossingCount: 0,
  ...overrides,
});

const period = (label: PeriodCost['label'], overrides: Partial<PeriodCost> = {}): PeriodCost => ({
  label,
  periodStart: label === 'today' ? '2026-09-09T00:00:00.000Z' : '2026-09-01T00:00:00.000Z',
  periodEnd: '2026-09-09T15:04:00.000Z',
  groups: [
    group('discovery', { estimatedCost: 1.2, totalTokens: 12 }),
    group('investigation', { estimatedCost: 2.3, totalTokens: 23 }),
    group('ki_extraction', { estimatedCost: 3.4, totalTokens: 34 }),
  ],
  totalEstimatedCost: 6.9,
  totalStatus: 'complete',
  totalTokens: 69,
  unknownFeatureTokens: 0,
  unknownFeatureDocCount: 0,
  ...overrides,
});

const ALWAYS_CAVEATS: CostCaveat[] = [
  'eis_pricing_assumed',
  'usd_assumed',
  'excludes_embeddings',
  'excludes_failed_calls',
  'excludes_cache_writes',
  'tracking_not_all_spaces',
];

const costResponse = (overrides: Partial<CostResponse> = {}): CostResponse => ({
  today: period('today'),
  month: period('this_month', { totalEstimatedCost: 20.5, totalTokens: 200 }),
  asOf: '2026-09-09T15:04:00.000Z',
  pricesFetchedAt: '2026-09-09T06:00:00.000Z',
  pricesStale: false,
  unavailableReason: null,
  caveats: ALWAYS_CAVEATS,
  trackingCoverage: {
    status: 'partial',
    enabledSpaceCount: 1,
    totalSpaceCount: 2,
  },
  ...overrides,
});

const setTracking = (enabled: boolean) => {
  tokenTracking = {
    enabled,
    savedEnabled: enabled,
    canEdit: true,
    isDirty: false,
    isSaving: false,
    updateEnabled: updateTokenTracking,
    cancel: cancelTokenTracking,
    save: saveTokenTracking,
  };
};

const setCost = (value: Partial<ReturnType<typeof useSignificantEventsCost>> = {}) => {
  mockUseSignificantEventsCost.mockReturnValue({
    data: costResponse(),
    isLoading: false,
    isRefreshing: false,
    error: null,
    refreshCost,
    retryCost,
    ...value,
  } as never);
};

const renderCost = () =>
  render(
    <I18nProvider>
      <CostEstimate tokenTracking={tokenTracking} />
    </I18nProvider>
  );

describe('CostEstimate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    refreshCost.mockReset().mockResolvedValue(undefined);
    retryCost.mockReset().mockResolvedValue(undefined);
    saveTokenTracking.mockResolvedValue('saved');
    mockUseRunQuotas.mockReturnValue({
      data: quotasResponse(),
      isLoading: false,
      isError: false,
    } as never);
    setTracking(true);
    setCost();
  });

  it('refreshes costs after unified save changes the stored tracking setting', async () => {
    setTracking(false);
    setCost({
      data: costResponse({
        trackingCoverage: {
          status: 'none',
          enabledSpaceCount: 0,
          totalSpaceCount: 2,
        },
      }),
    });
    const { rerender } = renderCost();
    expect(screen.getByTestId('nightshiftTokenTrackingSwitch')).not.toBeChecked();
    expect(screen.queryByTestId('nightshiftCostHeadline')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('nightshiftTokenTrackingSwitch'));
    expect(refreshCost).not.toHaveBeenCalled();

    setTracking(true);
    rerender(
      <I18nProvider>
        <CostEstimate tokenTracking={tokenTracking} />
      </I18nProvider>
    );

    await waitFor(() => expect(refreshCost).toHaveBeenCalledTimes(1));
  });

  it('shows positive sub-cent costs instead of rounding them to zero', () => {
    setCost({
      data: costResponse({
        today: period('today', {
          groups: [
            group('discovery', {
              estimatedCost: 0.003,
              totalTokens: 1,
              priceableTokens: 1,
            }),
            group('investigation', {
              estimatedCost: 0,
              totalTokens: 0,
              priceableTokens: 0,
            }),
            group('ki_extraction', {
              estimatedCost: 0,
              totalTokens: 0,
              priceableTokens: 0,
            }),
          ],
          totalEstimatedCost: 0.003,
          totalTokens: 1,
        }),
      }),
    });
    renderCost();

    expect(screen.getByTestId('nightshiftCostHeadline')).toHaveTextContent('<$0.01 today');
    expect(screen.getByTestId('nightshiftCostGroupToday-discovery')).toHaveTextContent('<$0.01');
  });

  it('keeps a partial numeric floor visible', () => {
    setCost({
      data: costResponse({
        today: period('today', {
          groups: [
            group('discovery', {
              status: 'partial' as CostStatus,
              estimatedCost: 1.2,
              unpriceableTokens: 4,
            }),
            group('investigation', { estimatedCost: 0, totalTokens: 0 }),
            group('ki_extraction', { estimatedCost: 0, totalTokens: 0 }),
          ],
          totalEstimatedCost: 1.2,
          totalStatus: 'partial',
        }),
      }),
    });
    renderCost();
    expect(screen.getByTestId('nightshiftCostGroupToday-discovery')).toHaveTextContent('~$1.20');
    expect(screen.getByTestId('nightshiftCostPartialBadge-discovery-today')).toHaveTextContent(
      'Partial floor'
    );
  });

  it('marks the combined estimate as partial when unknown feature usage is omitted', () => {
    setCost({
      data: costResponse({
        today: period('today', {
          totalStatus: 'partial',
          unknownFeatureTokens: 25,
          unknownFeatureDocCount: 1,
        }),
      }),
    });
    renderCost();
    expect(screen.getByTestId('nightshiftCostTotalPartialBadge')).toHaveTextContent(
      'Partial floor'
    );
    expect(
      screen.queryByTestId('nightshiftCostPartialBadge-discovery-today')
    ).not.toBeInTheDocument();
  });

  it('renders Unable to calculate for a null estimate and No recorded calls for zero tokens', () => {
    setCost({
      data: costResponse({
        today: period('today', {
          totalTokens: 5,
          totalEstimatedCost: null,
          totalStatus: 'partial',
          groups: [
            group('discovery', { estimatedCost: null, totalTokens: 5, priceableTokens: 0 }),
            group('investigation', { estimatedCost: 0, totalTokens: 0 }),
            group('ki_extraction', { estimatedCost: 0, totalTokens: 0 }),
          ],
        }),
        month: period('this_month', {
          totalTokens: 0,
          totalEstimatedCost: 0,
          groups: [
            group('discovery', { estimatedCost: 0, totalTokens: 0 }),
            group('investigation', { estimatedCost: 0, totalTokens: 0 }),
            group('ki_extraction', { estimatedCost: 0, totalTokens: 0 }),
          ],
        }),
      }),
    });
    renderCost();
    expect(screen.getByTestId('nightshiftCostHeadline')).toHaveTextContent(
      'Unable to calculate today · No recorded calls this month (recorded calls)'
    );
    expect(screen.queryByTestId('nightshiftCostTotalPartialBadge')).not.toBeInTheDocument();
  });
});
