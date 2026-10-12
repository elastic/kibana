/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { focusEuiToolTipTrigger } from '@elastic/eui/lib/test/rtl';
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
import { useRunQuotas } from '../hooks/use_significant_events_run_quotas';
import { CostEstimate } from './cost_estimate';
import type { TokenTrackingForm } from './use_token_tracking_form';

jest.mock('../hooks/use_significant_events_cost');
jest.mock('../hooks/use_significant_events_run_quotas');
jest.mock('@elastic/eui', () => {
  const actual = jest.requireActual('@elastic/eui');
  const { useState } = jest.requireActual('react') as typeof import('react');
  const MockEuiIconTip = ({
    content,
    anchorProps,
    'aria-label': ariaLabel,
  }: {
    content: React.ReactNode;
    anchorProps?: { 'data-test-subj'?: string };
    'aria-label'?: string;
  }) => {
    const [isOpen, setIsOpen] = useState(false);
    return (
      <>
        <button
          type="button"
          aria-label={ariaLabel}
          data-test-subj={anchorProps?.['data-test-subj']}
          onMouseEnter={() => setIsOpen(true)}
          onMouseLeave={() => setIsOpen(false)}
          onFocus={() => setIsOpen(true)}
          onBlur={() => setIsOpen(false)}
        />
        {isOpen ? <span role="tooltip">{content}</span> : null}
      </>
    );
  };
  const MockEuiToolTip = ({
    content,
    children,
  }: {
    content?: React.ReactNode;
    children: React.ReactNode;
  }) => {
    const [isOpen, setIsOpen] = useState(false);
    return (
      <span
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        onFocus={() => setIsOpen(true)}
        onBlur={() => setIsOpen(false)}
      >
        {children}
        {isOpen && content ? <span role="tooltip">{content}</span> : null}
      </span>
    );
  };

  return {
    ...actual,
    EuiIconTip: MockEuiIconTip,
    EuiToolTip: MockEuiToolTip,
  };
});

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

const quotasResponse = (canManage: boolean): RunQuotasResponse => ({
  enabled: true,
  limits: { detection: 1, investigation: 1, ki_extraction: 1 },
  counts: { detection: 0, investigation: 0, ki_extraction: 0 },
  window: {
    start: '2026-09-09T00:00:00.000Z',
    resetsAt: '2026-09-10T00:00:00.000Z',
    timezone: 'UTC',
  },
  canManage,
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

const setTracking = (
  enabled: boolean,
  canEdit = true,
  overrides: Partial<TokenTrackingForm> = {}
) => {
  tokenTracking = {
    enabled,
    savedEnabled: enabled,
    canEdit,
    isDirty: false,
    isSaving: false,
    updateEnabled: updateTokenTracking,
    cancel: cancelTokenTracking,
    save: saveTokenTracking,
    ...overrides,
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
      data: quotasResponse(true),
      isLoading: false,
      isError: false,
    } as never);
    setTracking(true);
    setCost();
  });

  it('is hidden while privilege is unknown', () => {
    mockUseRunQuotas.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    } as never);
    renderCost();
    expect(screen.queryByTestId('nightshiftCostSection')).not.toBeInTheDocument();
  });

  it('is hidden for canManage false', () => {
    mockUseRunQuotas.mockReturnValue({
      data: quotasResponse(false),
      isLoading: false,
      isError: false,
    } as never);
    renderCost();
    expect(screen.queryByTestId('nightshiftCostSection')).not.toBeInTheDocument();
  });

  it('is hidden and disables cost fetching when stale privilege data has an error', () => {
    mockUseRunQuotas.mockReturnValue({
      data: quotasResponse(true),
      isLoading: false,
      isError: true,
    } as never);
    renderCost();
    expect(screen.queryByTestId('nightshiftCostSection')).not.toBeInTheDocument();
  });

  it('shows cost details without requiring expansion', () => {
    renderCost();
    expect(screen.getByTestId('nightshiftCostHeader')).toHaveTextContent(
      'Approximate inference cost across all spaces'
    );
    expect(screen.getByTestId('nightshiftTokenTrackingSwitch')).toBeChecked();
    expect(screen.getByTestId('nightshiftCostHeadline')).toBeVisible();
  });

  it('stages token tracking changes without saving immediately', () => {
    setTracking(false);
    renderCost();
    expect(screen.queryByTestId('nightshiftTokenTrackingCoverage')).not.toBeInTheDocument();
    expect(screen.getByTestId('nightshiftCostHeadline')).toBeInTheDocument();
    const trackingSwitch = screen.getByTestId('nightshiftTokenTrackingSwitch');
    expect(trackingSwitch).not.toBeChecked();
    expect(mockUseSignificantEventsCost).toHaveBeenCalledWith({ enabled: true });

    fireEvent.click(trackingSwitch);

    expect(updateTokenTracking).toHaveBeenCalledWith(true);
    expect(refreshCost).not.toHaveBeenCalled();
  });

  it('disables the tracking switch without Advanced Settings save permission', () => {
    setTracking(false, false);
    renderCost();
    const trackingSwitch = screen.getByTestId('nightshiftTokenTrackingSwitch');
    expect(trackingSwitch).toBeDisabled();
    const tooltipAnchor = screen.getByTestId('nightshiftEnableTokenTrackingTooltipAnchor');
    expect(tooltipAnchor).toHaveAttribute('tabindex', '0');
    const restoreFocus = focusEuiToolTipTrigger(tooltipAnchor);
    expect(screen.getByRole('tooltip')).toHaveTextContent(
      'You need permission to save Advanced Settings before you can enable token tracking.'
    );
    restoreFocus();
  });

  it('shows cross-space token tracking coverage', () => {
    renderCost();
    expect(screen.getByTestId('nightshiftTrackingCoverageCallout')).toHaveTextContent(
      'Token tracking is enabled in 1 of 2 spaces'
    );
    expect(screen.getByTestId('nightshiftTrackingCoverageCallout')).toHaveTextContent(
      'This deployment-wide estimate includes all Significant Events calls recorded during the selected period.'
    );
  });

  it('shows full coverage without a coverage callout', () => {
    setCost({
      data: costResponse({
        caveats: ALWAYS_CAVEATS.filter((caveat) => caveat !== 'tracking_not_all_spaces'),
        trackingCoverage: {
          status: 'full',
          enabledSpaceCount: 2,
          totalSpaceCount: 2,
        },
      }),
    });
    renderCost();
    expect(screen.queryByTestId('nightshiftTrackingCoverageCallout')).not.toBeInTheDocument();
    expect(screen.getByTestId('nightshiftCostHeadline')).toBeInTheDocument();
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

  it('shows recorded global costs when coverage cannot be determined', () => {
    setCost({
      data: costResponse({
        trackingCoverage: {
          status: 'unavailable',
          enabledSpaceCount: null,
          totalSpaceCount: null,
        },
      }),
    });
    renderCost();
    expect(screen.getByTestId('nightshiftTrackingCoverageCallout')).toHaveTextContent(
      'Unable to determine token tracking coverage'
    );
    expect(screen.getByTestId('nightshiftCostHeadline')).toBeInTheDocument();
  });

  it('shows a loading spinner on the initial query', () => {
    setCost({ data: undefined, isLoading: true });
    renderCost();
    expect(screen.getByTestId('nightshiftCostLoading')).toBeVisible();
  });

  it('renders the headline, both group columns, fixed order, and numeric formatting', () => {
    renderCost();
    expect(screen.getByTestId('nightshiftCostHeadline')).toHaveTextContent(
      '~$6.90 today · ~$20.50 this month (recorded calls)'
    );
    const groups = screen.getAllByTestId(/^nightshiftCostGroup-/);
    expect(groups.map((node) => node.getAttribute('data-test-subj'))).toEqual([
      'nightshiftCostGroup-discovery',
      'nightshiftCostGroup-investigation',
      'nightshiftCostGroup-ki_extraction',
    ]);
    expect(screen.getByText('Discovery')).toBeInTheDocument();
    expect(screen.getByText('Investigation')).toBeInTheDocument();
    expect(screen.getByText('KI extraction')).toBeInTheDocument();
    expect(screen.getByTestId('nightshiftCostGroupToday-discovery')).toHaveTextContent('~$1.20');
    expect(screen.getByTestId('nightshiftCostGroupMonth-ki_extraction')).toHaveTextContent(
      '~$3.40'
    );
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

  it('shows network, pricing, and usage-data errors with Retry', async () => {
    setCost({ data: undefined, error: new Error('network down') });
    retryCost.mockImplementationOnce(async () => {
      setCost();
    });
    const { unmount, rerender } = renderCost();
    expect(screen.getByText('Cost estimate unavailable')).toBeInTheDocument();
    expect(screen.getByText('network down')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('nightshiftCostRetryButton'));
    await waitFor(() => expect(retryCost).toHaveBeenCalled());
    rerender(
      <I18nProvider>
        <CostEstimate tokenTracking={tokenTracking} />
      </I18nProvider>
    );
    expect(screen.queryByText('Cost estimate unavailable')).not.toBeInTheDocument();
    expect(screen.getByTestId('nightshiftCostHeadline')).toBeVisible();
    unmount();

    setCost({
      data: costResponse({ unavailableReason: 'pricing' }),
      error: null,
    });
    const pricing = renderCost();
    expect(screen.getByText('Unable to fetch pricing data')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('nightshiftCostRetryButton'));
    expect(retryCost).toHaveBeenCalledTimes(2);
    pricing.unmount();

    setCost({
      data: costResponse({ unavailableReason: 'usage_data' }),
      error: null,
    });
    renderCost();
    expect(screen.getByText('Unable to read token usage data')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('nightshiftCostRetryButton'));
    expect(retryCost).toHaveBeenCalledTimes(3);
  });

  it('keeps the last estimate visible while retrying a failed refresh', async () => {
    setCost({ data: costResponse(), error: new Error('refresh failed') });
    refreshCost.mockImplementationOnce(async () => {
      setCost();
    });
    const { rerender } = renderCost();
    expect(screen.getByText('Unable to refresh cost estimate')).toBeInTheDocument();
    expect(screen.getByText('refresh failed')).toBeInTheDocument();
    expect(screen.getByTestId('nightshiftCostHeadline')).toBeVisible();

    fireEvent.click(screen.getByTestId('nightshiftCostRetryButton'));
    await waitFor(() => expect(refreshCost).toHaveBeenCalled());
    expect(retryCost).not.toHaveBeenCalled();
    rerender(
      <I18nProvider>
        <CostEstimate tokenTracking={tokenTracking} />
      </I18nProvider>
    );
    expect(screen.queryByText('Unable to refresh cost estimate')).not.toBeInTheDocument();
    expect(screen.getByTestId('nightshiftCostHeadline')).toBeVisible();
  });

  it('translates caveats, stale prices, and singular and plural tier crossings', () => {
    setCost({
      data: costResponse({
        pricesStale: true,
        caveats: [...ALWAYS_CAVEATS, 'prices_stale', 'tier_crossings_detected'],
        month: period('this_month', {
          groups: [
            group('discovery', { tierCrossingCount: 1 }),
            group('investigation', { tierCrossingCount: 0 }),
            group('ki_extraction', { tierCrossingCount: 0 }),
          ],
        }),
      }),
    });
    const { rerender } = renderCost();
    expect(screen.queryByTestId('nightshiftCostDetails')).not.toBeInTheDocument();
    fireEvent.focus(screen.getByTestId('nightshiftCostDetailsTooltip'));
    const caveats = screen.getByTestId('nightshiftCostDetails');
    expect(caveats).toHaveTextContent('Prices are based on Elastic Inference Service list rates.');
    expect(caveats).not.toHaveTextContent(
      'Pricing is treated as USD because the catalog does not identify a currency.'
    );
    expect(caveats).toHaveTextContent('Embedding and rerank inference is excluded.');
    expect(caveats).toHaveTextContent(
      'Calls that fail before token usage is recorded are excluded.'
    );
    expect(caveats).toHaveTextContent(
      'Cache-write tokens are excluded because Kibana does not record them.'
    );
    expect(caveats).toHaveTextContent(
      'Token tracking is not enabled in every space. Calls made while tracking was disabled are not included.'
    );
    expect(caveats).toHaveTextContent(
      'Price data is outdated; estimates may not reflect current rates.'
    );
    expect(caveats).toHaveTextContent(
      'Estimate uses lower-tier pricing; 1 call exceeded the tier threshold.'
    );
    expect(screen.getByTestId('nightshiftCostPricingLink')).toHaveAttribute(
      'href',
      'https://cloud.elastic.co/cloud-pricing-table?productType=serverless&solution=elasticsearch'
    );

    setCost({
      data: costResponse({
        caveats: [...ALWAYS_CAVEATS, 'tier_crossings_detected'],
        month: period('this_month', {
          groups: [
            group('discovery', { tierCrossingCount: 2 }),
            group('investigation', { tierCrossingCount: 3 }),
            group('ki_extraction', { tierCrossingCount: 0 }),
          ],
        }),
      }),
    });
    rerender(
      <I18nProvider>
        <CostEstimate tokenTracking={tokenTracking} />
      </I18nProvider>
    );
    expect(screen.getByTestId('nightshiftCostDetails')).toHaveTextContent(
      'Estimate uses lower-tier pricing; 5 calls exceeded the tier threshold.'
    );
  });
});
