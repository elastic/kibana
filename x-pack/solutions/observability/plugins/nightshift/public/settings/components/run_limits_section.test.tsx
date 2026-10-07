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
  RunQuotaGroup,
  RunQuotaSettingsUpdate,
  RunQuotasResponse,
} from '@kbn/significant-events-plugin/common';
import { useRunQuotas, useUpdateRunQuotas } from '../hooks/use_significant_events_run_quotas';
import { RunLimitsSection } from './run_limits_section';

jest.mock('../hooks/use_significant_events_run_quotas');

const mockUseRunQuotas = useRunQuotas as jest.MockedFunction<typeof useRunQuotas>;
const mockUseUpdateRunQuotas = useUpdateRunQuotas as jest.MockedFunction<typeof useUpdateRunQuotas>;

const save = jest.fn<Promise<RunQuotasResponse>, [RunQuotaSettingsUpdate]>();
const refetch = jest.fn();

const response = (overrides: Partial<RunQuotasResponse> = {}): RunQuotasResponse => ({
  enabled: true,
  limits: {
    detection: 100,
    investigation: 30,
    ki_extraction: 20,
  },
  counts: {
    detection: 4,
    investigation: 3,
    ki_extraction: 2,
  },
  window: {
    start: '2026-09-03T00:00:00.000Z',
    resetsAt: '2026-09-04T00:00:00.000Z',
    timezone: 'UTC',
  },
  canManage: true,
  ...overrides,
});

const setQueryResponse = (data: RunQuotasResponse) => {
  mockUseRunQuotas.mockReturnValue({
    data,
    isLoading: false,
    isError: false,
    refetch,
  } as unknown as ReturnType<typeof useRunQuotas>);
};

const setup = (
  data: RunQuotasResponse = response(),
  groups?: readonly RunQuotaGroup[],
  onUnsavedChangesChange?: (hasUnsavedChanges: boolean) => void
) => {
  setQueryResponse(data);
  mockUseUpdateRunQuotas.mockReturnValue({ save, isSaving: false });
  save.mockResolvedValue(data);

  return render(
    <I18nProvider>
      <RunLimitsSection groups={groups} onUnsavedChangesChange={onUnsavedChangesChange} />
    </I18nProvider>
  );
};

describe('RunLimitsSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('hides category details while enforcement is off and shows suggested limits when enabled', () => {
    setup(
      response({
        enabled: false,
        limits: {
          detection: 100,
          investigation: 30,
          ki_extraction: 20,
        },
        counts: {
          detection: 14,
          investigation: 6,
          ki_extraction: 25,
        },
      })
    );

    expect(screen.queryByTestId(/^nightshiftRunLimitRow-/)).not.toBeInTheDocument();
    expect(screen.queryByTestId('nightshiftRunLimitsResetTime')).not.toBeInTheDocument();
    expect(screen.getByTestId('nightshiftRunLimitsEnforcementSwitch')).not.toBeChecked();

    fireEvent.click(screen.getByTestId('nightshiftRunLimitsEnforcementSwitch'));

    expect(screen.getAllByTestId(/^nightshiftRunLimitRow-/)).toHaveLength(3);
    expect(screen.getByText('Discovery daily limit')).toBeInTheDocument();
    expect(screen.getByText('Investigation daily limit')).toBeInTheDocument();
    expect(screen.getByText('Knowledge indicator extraction daily limit')).toBeInTheDocument();
    expect(screen.getByTestId('nightshiftRunLimitCount-detection')).toHaveTextContent(
      '14 counted scheduled admissions today'
    );
    expect(screen.getByTestId('nightshiftRunLimitCount-investigation')).toHaveTextContent(
      '6 counted scheduled admissions today'
    );
    expect(screen.getByTestId('nightshiftRunLimitCount-ki_extraction')).toHaveTextContent(
      '25 counted scheduled admissions today'
    );
    expect(screen.getByTestId('nightshiftRunLimitInput-detection')).toHaveValue(100);
    expect(screen.getByTestId('nightshiftRunLimitInput-investigation')).toHaveValue(30);
    expect(screen.getByTestId('nightshiftRunLimitInput-ki_extraction')).toHaveValue(20);
    expect(screen.getByTestId('nightshiftRunLimitsEnforcementSwitch')).toBeChecked();
  });

  it('prevents read-only users from editing the switch or limits', () => {
    setup(response({ canManage: false }));

    expect(screen.getByTestId('nightshiftRunLimitsEnforcementSwitch')).toBeDisabled();
    for (const group of ['detection', 'investigation', 'ki_extraction']) {
      expect(screen.getByTestId(`nightshiftRunLimitInput-${group}`)).toBeDisabled();
    }
    expect(screen.getByText('Deployment-wide privilege required')).toBeInTheDocument();
  });

  it('renders only the requested quota groups', () => {
    setup(response(), ['investigation']);

    expect(screen.getAllByTestId(/^nightshiftRunLimitRow-/)).toHaveLength(1);
    expect(screen.getByText('Investigation daily limit')).toBeInTheDocument();
    expect(screen.queryByText('Discovery daily limit')).not.toBeInTheDocument();
    expect(
      screen.queryByText('Knowledge indicator extraction daily limit')
    ).not.toBeInTheDocument();
    expect(screen.getByText('0 means unlimited.')).toBeInTheDocument();
    expect(screen.getByText('Enforce daily limits across Nightshift')).toBeInTheDocument();
    expect(screen.getByText(/Enforcement applies deployment-wide/)).toBeInTheDocument();
  });

  it('reports unsaved limit changes to the owning settings tab', () => {
    const onUnsavedChangesChange = jest.fn();
    setup(response(), ['investigation'], onUnsavedChangesChange);

    expect(onUnsavedChangesChange).toHaveBeenLastCalledWith(false);

    fireEvent.change(screen.getByTestId('nightshiftRunLimitInput-investigation'), {
      target: { value: '20' },
    });

    expect(onUnsavedChangesChange).toHaveBeenLastCalledWith(true);

    fireEvent.click(screen.getByTestId('nightshiftRunLimitsSectionCancelButton'));

    expect(onUnsavedChangesChange).toHaveBeenLastCalledWith(false);
  });

  it('warns about exhausted groups hidden from the tab when enabling global enforcement', async () => {
    setup(
      response({
        enabled: false,
        counts: {
          detection: 100,
          investigation: 3,
          ki_extraction: 2,
        },
      }),
      ['investigation']
    );

    fireEvent.click(screen.getByTestId('nightshiftRunLimitsEnforcementSwitch'));
    fireEvent.click(screen.getByTestId('nightshiftSaveRunLimitsButton'));

    const modal = await screen.findByTestId('nightshiftRunLimitsConfirmationModal');
    expect(modal).toHaveTextContent('Enable enforcement with reached limits?');
    expect(modal).toHaveTextContent('Discovery');
    expect(save).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Enable and save changes' }));

    await waitFor(() => expect(save).toHaveBeenCalledWith({ enabled: true }));
  });

  it('does not show the exhaustion callout for groups hidden from the tab', () => {
    setup(
      response({
        counts: {
          detection: 100,
          investigation: 3,
          ki_extraction: 2,
        },
      }),
      ['investigation']
    );

    expect(screen.queryByTestId('nightshiftRunLimitsBanner')).not.toBeInTheDocument();
  });

  it('saves zero as unlimited and sends only the changed category', async () => {
    setup();
    fireEvent.change(screen.getByTestId('nightshiftRunLimitInput-detection'), {
      target: { value: '0' },
    });
    fireEvent.click(screen.getByTestId('nightshiftSaveRunLimitsButton'));

    await waitFor(() =>
      expect(save).toHaveBeenCalledWith({
        limits: { detection: 0 },
      })
    );
  });

  it('validates daily limits locally before saving', () => {
    setup();
    fireEvent.change(screen.getByTestId('nightshiftRunLimitInput-detection'), {
      target: { value: '' },
    });

    expect(screen.getByText(/Enter a whole number from 0 to/)).toBeInTheDocument();
    expect(screen.getByTestId('nightshiftSaveRunLimitsButton')).toBeDisabled();
    expect(save).not.toHaveBeenCalled();
  });

  it('warns before lowering a finite limit to the current count', async () => {
    setup(
      response({
        counts: {
          detection: 84,
          investigation: 3,
          ki_extraction: 2,
        },
      })
    );
    fireEvent.change(screen.getByTestId('nightshiftRunLimitInput-detection'), {
      target: { value: '84' },
    });
    fireEvent.click(screen.getByTestId('nightshiftSaveRunLimitsButton'));

    expect(await screen.findByText('Lower limits to values already reached?')).toBeInTheDocument();
    expect(save).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Save lower limits' }));

    await waitFor(() =>
      expect(save).toHaveBeenCalledWith({
        limits: { detection: 84 },
      })
    );
  });

  it('warns when enabling enforcement would immediately deny a category', async () => {
    setup(
      response({
        enabled: false,
        counts: {
          detection: 100,
          investigation: 3,
          ki_extraction: 2,
        },
      })
    );
    fireEvent.click(screen.getByTestId('nightshiftRunLimitsEnforcementSwitch'));
    fireEvent.click(screen.getByTestId('nightshiftSaveRunLimitsButton'));

    expect(await screen.findByText('Enable enforcement with reached limits?')).toBeInTheDocument();
    expect(save).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Enable and save changes' }));

    await waitFor(() =>
      expect(save).toHaveBeenCalledWith({
        enabled: true,
      })
    );
  });

  it('warns before disabling enforcement', async () => {
    setup(
      response({
        counts: {
          detection: 100,
          investigation: 3,
          ki_extraction: 2,
        },
      })
    );
    expect(screen.getByTestId('nightshiftRunLimitsBanner')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('nightshiftRunLimitsEnforcementSwitch'));
    expect(screen.queryByTestId('nightshiftRunLimitsBanner')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('nightshiftSaveRunLimitsButton'));

    expect(await screen.findByText('Disable daily run limits?')).toBeInTheDocument();
    expect(save).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Disable and save changes' }));

    await waitFor(() =>
      expect(save).toHaveBeenCalledWith({
        enabled: false,
      })
    );
  });

  it('does not describe an investigation severity bypass', () => {
    setup(
      response({
        counts: {
          detection: 4,
          investigation: 45,
          ki_extraction: 2,
        },
      })
    );

    expect(
      screen.queryByTestId('nightshiftInvestigationCriticalContinuation')
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/non-critical scheduled/i)).not.toBeInTheDocument();
    expect(
      screen.queryByText(/critical scheduled investigations continue/i)
    ).not.toBeInTheDocument();
  });

  it('keeps the active exhaustion banner while a raised limit is unsaved', () => {
    setup(
      response({
        counts: {
          detection: 100,
          investigation: 3,
          ki_extraction: 2,
        },
      })
    );
    expect(screen.getByTestId('nightshiftRunLimitsBanner')).toBeInTheDocument();

    fireEvent.change(screen.getByTestId('nightshiftRunLimitInput-detection'), {
      target: { value: '101' },
    });

    expect(screen.getByTestId('nightshiftRunLimitsBanner')).toBeInTheDocument();
  });

  it('shows the UTC reset value supplied by the API window', () => {
    setup(
      response({
        window: {
          start: '2040-01-02T00:00:00.000Z',
          resetsAt: '2040-01-03T00:00:00.000Z',
          timezone: 'UTC',
        },
      })
    );

    expect(screen.getByTestId('nightshiftRunLimitsResetTime')).toHaveTextContent(
      'The current UTC day resets at 2040-01-03T00:00:00.000Z.'
    );
  });

  it('retains a dirty draft when the query receives a background update', () => {
    const { rerender } = setup();
    fireEvent.change(screen.getByTestId('nightshiftRunLimitInput-detection'), {
      target: { value: '80' },
    });

    setQueryResponse(
      response({
        limits: {
          detection: 90,
          investigation: 30,
          ki_extraction: 20,
        },
        counts: {
          detection: 8,
          investigation: 3,
          ki_extraction: 2,
        },
      })
    );
    rerender(
      <I18nProvider>
        <RunLimitsSection />
      </I18nProvider>
    );

    expect(screen.getByTestId('nightshiftRunLimitInput-detection')).toHaveValue(80);
    expect(screen.getByTestId('nightshiftRunLimitCount-detection')).toHaveTextContent(
      '8 counted scheduled admissions today'
    );
  });

  it('retains the draft and shows an actionable error after a failed write', async () => {
    setup();
    save.mockRejectedValueOnce(new Error('server unavailable'));
    fireEvent.change(screen.getByTestId('nightshiftRunLimitInput-detection'), {
      target: { value: '80' },
    });
    fireEvent.click(screen.getByTestId('nightshiftSaveRunLimitsButton'));

    expect(await screen.findByText('Could not save daily run limits')).toBeInTheDocument();
    expect(screen.getByText(/server unavailable/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
    expect(screen.getByTestId('nightshiftRunLimitInput-detection')).toHaveValue(80);
  });
});
