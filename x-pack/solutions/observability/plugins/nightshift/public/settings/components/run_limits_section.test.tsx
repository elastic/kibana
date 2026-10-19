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
import { SettingsSaveBar } from './settings_save_bar';
import { useRunLimitsForm } from './use_run_limits_form';

jest.mock('../hooks/use_significant_events_run_quotas');

const mockUseRunQuotas = useRunQuotas as jest.MockedFunction<typeof useRunQuotas>;
const mockUseUpdateRunQuotas = useUpdateRunQuotas as jest.MockedFunction<typeof useUpdateRunQuotas>;

const save = jest.fn<Promise<RunQuotasResponse>, [RunQuotaSettingsUpdate]>();
const refetch = jest.fn();
let updateIsSaving = false;

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

const ALL_GROUPS = ['detection', 'investigation', 'ki_extraction'] as const;

const TestRunLimits = ({ groups = ALL_GROUPS }: { groups?: readonly RunQuotaGroup[] }) => {
  const form = useRunLimitsForm({ groups });
  const onSave = async () => {
    await form.requestSave();
  };
  const onConfirmSave = async () => {
    await form.confirmAndSave();
  };

  return (
    <>
      <RunLimitsSection groups={groups} form={form} onSave={onSave} onConfirmSave={onConfirmSave} />
      <SettingsSaveBar
        hasChanges={form.isDirty}
        isSaving={form.isSaving}
        onCancel={form.cancel}
        onSave={onSave}
        isSaveDisabled={!form.canManage || !form.update}
      />
    </>
  );
};

const setup = (data: RunQuotasResponse = response(), groups?: readonly RunQuotaGroup[]) => {
  setQueryResponse(data);
  mockUseUpdateRunQuotas.mockReturnValue({ save, isSaving: updateIsSaving });
  save.mockResolvedValue(data);

  return render(
    <I18nProvider>
      <TestRunLimits groups={groups} />
    </I18nProvider>
  );
};

describe('RunLimitsSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    updateIsSaving = false;
  });

  it('shows legacy globally disabled settings as unlimited per category', () => {
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

    expect(screen.getAllByTestId(/^nightshiftRunLimitRow-/)).toHaveLength(3);
    expect(screen.getByTestId('nightshiftRunLimitCount-detection')).toHaveTextContent(
      '14 counted scheduled admissions today'
    );
    expect(screen.queryByTestId(/^nightshiftRunLimitInput-/)).not.toBeInTheDocument();
    for (const group of ALL_GROUPS) {
      expect(screen.getByTestId(`nightshiftRunLimitEnabledSwitch-${group}`)).not.toBeChecked();
    }
  });

  it('prevents read-only users from editing the switch or limits', () => {
    setup(response({ canManage: false }));

    for (const group of ['detection', 'investigation', 'ki_extraction']) {
      expect(screen.getByTestId(`nightshiftRunLimitEnabledSwitch-${group}`)).toBeDisabled();
      expect(screen.getByTestId(`nightshiftRunLimitInput-${group}`)).toBeDisabled();
    }
    expect(screen.getByText('Deployment-wide privileges required')).toBeInTheDocument();
  });

  it('renders only the requested quota groups', () => {
    setup(response(), ['investigation']);

    expect(screen.getByTestId('nightshiftRunLimitsSection')).toHaveAccessibleName('Run limits');
    expect(screen.getAllByTestId(/^nightshiftRunLimitRow-/)).toHaveLength(1);
    expect(screen.getByText('Investigation daily limit')).toBeInTheDocument();
    expect(screen.queryByText('Discovery daily limit')).not.toBeInTheDocument();
    expect(
      screen.queryByText('Knowledge indicators extraction daily limit')
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('switch', { name: 'Enforce daily limits for Investigation' })
    ).toBeInTheDocument();
  });

  it('cancels run-limit changes through the shared save bar', () => {
    setup(response(), ['investigation']);
    fireEvent.change(screen.getByTestId('nightshiftRunLimitInput-investigation'), {
      target: { value: '20' },
    });

    expect(
      screen.getByTestId('streams-significant-events-settings-bottom-bar')
    ).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('streams-settings-cancel-button'));

    expect(screen.getByTestId('nightshiftRunLimitInput-investigation')).toHaveValue(30);
    expect(
      screen.queryByTestId('streams-significant-events-settings-bottom-bar')
    ).not.toBeInTheDocument();
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

  it('saves zero when a category is switched to unlimited', async () => {
    setup();
    fireEvent.click(screen.getByTestId('nightshiftRunLimitEnabledSwitch-detection'));

    expect(screen.queryByTestId('nightshiftRunLimitInput-detection')).not.toBeInTheDocument();
    expect(screen.getByTestId('nightshiftRunLimitCount-detection')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('streams-settings-save-button'));

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

    expect(screen.getByText(/Enter a whole number from 1 to/)).toBeInTheDocument();
    expect(screen.getByTestId('streams-settings-save-button')).toBeDisabled();
    expect(save).not.toHaveBeenCalled();
  });

  it('warns before lowering a finite limit to the current count', async () => {
    const { rerender } = setup(
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
    fireEvent.click(screen.getByTestId('streams-settings-save-button'));

    expect(await screen.findByText('Lower limits to values already reached?')).toBeInTheDocument();
    expect(save).not.toHaveBeenCalled();

    updateIsSaving = true;
    mockUseUpdateRunQuotas.mockReturnValue({ save, isSaving: updateIsSaving });
    rerender(
      <I18nProvider>
        <TestRunLimits />
      </I18nProvider>
    );
    expect(screen.getByRole('button', { name: 'Save lower limits' })).toBeDisabled();

    updateIsSaving = false;
    mockUseUpdateRunQuotas.mockReturnValue({ save, isSaving: updateIsSaving });
    rerender(
      <I18nProvider>
        <TestRunLimits />
      </I18nProvider>
    );
    fireEvent.click(screen.getByRole('button', { name: 'Save lower limits' }));

    await waitFor(() =>
      expect(save).toHaveBeenCalledWith({
        limits: { detection: 84 },
      })
    );
  });

  it('warns when changing unlimited to a finite limit that is already reached', async () => {
    setup(
      response({
        limits: {
          detection: 0,
          investigation: 30,
          ki_extraction: 20,
        },
        counts: {
          detection: 15,
          investigation: 3,
          ki_extraction: 2,
        },
      })
    );

    fireEvent.click(screen.getByTestId('nightshiftRunLimitEnabledSwitch-detection'));
    expect(screen.getByTestId('nightshiftRunLimitInput-detection')).toHaveValue(15);
    fireEvent.click(screen.getByTestId('streams-settings-save-button'));

    expect(await screen.findByText('Lower limits to values already reached?')).toBeInTheDocument();
    expect(save).not.toHaveBeenCalled();
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
        <TestRunLimits />
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
    fireEvent.click(screen.getByTestId('streams-settings-save-button'));

    expect(await screen.findByText('Could not save daily run limits')).toBeInTheDocument();
    expect(screen.getByText(/server unavailable/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
    expect(screen.getByTestId('nightshiftRunLimitInput-detection')).toHaveValue(80);
  });
});
