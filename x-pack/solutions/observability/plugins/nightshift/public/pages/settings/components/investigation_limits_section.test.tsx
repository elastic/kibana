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
  InvestigationQuotasResponse,
  InvestigationQuotasUpdate,
} from '@kbn/nightshift-investigations-plugin/common';
import { InvestigationLimitsSection } from './investigation_limits_section';
import { SettingsSaveBar } from './settings_save_bar';
import { useInvestigationLimitsForm } from './use_investigation_limits_form';

const mockSave = jest.fn<Promise<InvestigationQuotasResponse>, [InvestigationQuotasUpdate]>();
const mockRefetch = jest.fn();
const mockNavigateToUrl = jest.fn();
let mockQuotas: {
  data?: InvestigationQuotasResponse;
  isLoading: boolean;
  isError: boolean;
  refetch: jest.Mock;
};
let mockIsSaving = false;
let mockAutomationsAvailable = true;

jest.mock('../../../data/run_quotas/use_investigation_quotas', () => ({
  useInvestigationQuotas: () => mockQuotas,
  useUpdateInvestigationQuotas: () => ({ save: mockSave, isSaving: mockIsSaving }),
}));
jest.mock('../../../hooks/use_kibana', () => ({
  useKibana: () => ({
    services: {
      featureFlags: { useBooleanValue: () => mockAutomationsAvailable },
      nightshiftInvestigations: { investigationsClient: {} },
      application: {
        getUrlForApp: (_appId: string, { path }: { path: string }) => `/app/nightshift${path}`,
        navigateToUrl: mockNavigateToUrl,
      },
    },
  }),
}));

const response = (
  overrides: Partial<InvestigationQuotasResponse> = {}
): InvestigationQuotasResponse => ({
  enabled: true,
  limits: { automatic_investigation: 30, manual_investigation: null, total_investigation: null },
  counts: { automatic_investigation: 3, manual_investigation: 0, total_investigation: 3 },
  window: {
    start: '2026-09-03T00:00:00.000Z',
    resetsAt: '2026-09-04T00:00:00.000Z',
    timezone: 'UTC',
  },
  canManage: true,
  ...overrides,
});

const GROUP_LIMITS = {
  automatic_investigation: 4,
  manual_investigation: 6,
  total_investigation: 9,
};

const setQuotas = (data: InvestigationQuotasResponse) => {
  mockQuotas = { data, isLoading: false, isError: false, refetch: mockRefetch };
};

const TestForm = () => {
  const form = useInvestigationLimitsForm();
  const onSave = async () => {
    await form.requestSave();
  };
  const onConfirmSave = async () => {
    await form.confirmAndSave();
  };

  return (
    <>
      <InvestigationLimitsSection
        form={form}
        description="Daily limits"
        onSave={onSave}
        onConfirmSave={onConfirmSave}
      />
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

const renderForm = (data: InvestigationQuotasResponse = response()) => {
  setQuotas(data);
  mockSave.mockResolvedValue(data);
  return render(
    <I18nProvider>
      <TestForm />
    </I18nProvider>
  );
};

const rerenderForm = (rerender: ReturnType<typeof render>['rerender']) =>
  rerender(
    <I18nProvider>
      <TestForm />
    </I18nProvider>
  );

const input = (group: string) => screen.getByTestId(`nightshiftRunLimitInput-${group}`);
const enforceSwitch = () => screen.getByTestId('nightshiftRunLimitsEnabledSwitch');
const saveButton = () => screen.getByTestId('streams-settings-save-button');

describe('InvestigationLimitsSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsSaving = false;
    mockAutomationsAvailable = true;
  });

  it('shows each limit with its count, and an unlimited limit as an empty input', () => {
    renderForm();

    expect(screen.getAllByTestId(/^nightshiftRunLimitRow-/)).toHaveLength(3);
    expect(screen.getByText('Automatic investigations daily limit')).toBeInTheDocument();
    expect(screen.getByText('Manual investigations daily limit')).toBeInTheDocument();
    expect(screen.getByText('All investigations daily limit')).toBeInTheDocument();
    expect(input('automatic_investigation')).toHaveValue(30);
    expect(input('manual_investigation')).toHaveValue(null);
    expect(input('manual_investigation')).toHaveAttribute('placeholder', 'No limit');
    expect(screen.getByTestId('nightshiftRunLimitCount-automatic_investigation')).toHaveTextContent(
      '3 investigations started today'
    );
    expect(enforceSwitch()).toBeChecked();
  });

  it('prevents read-only users from editing the switch or limits', () => {
    renderForm(response({ canManage: false }));

    expect(enforceSwitch()).toBeDisabled();
    expect(input('automatic_investigation')).toBeDisabled();
    expect(screen.getByText('Deployment-wide privileges required')).toBeInTheDocument();
  });

  it('turns every limit off and back on with one switch, keeping their values', async () => {
    renderForm(response({ limits: GROUP_LIMITS }));

    fireEvent.click(enforceSwitch());
    expect(screen.queryAllByTestId(/^nightshiftRunLimitInput-/)).toHaveLength(0);
    fireEvent.click(enforceSwitch());
    expect(input('automatic_investigation')).toHaveValue(4);
    expect(input('manual_investigation')).toHaveValue(6);
    expect(input('total_investigation')).toHaveValue(9);

    fireEvent.click(enforceSwitch());
    fireEvent.click(saveButton());
    await waitFor(() => expect(mockSave).toHaveBeenCalledWith({ enabled: false }));
  });

  it('shows the stored limits when the switch is turned on after a reload', () => {
    renderForm(response({ enabled: false, limits: GROUP_LIMITS }));

    expect(enforceSwitch()).not.toBeChecked();
    fireEvent.click(enforceSwitch());
    expect(input('automatic_investigation')).toHaveValue(4);
    expect(input('manual_investigation')).toHaveValue(6);
    expect(input('total_investigation')).toHaveValue(9);
  });

  it('restores the previous limits after saving the switch off', async () => {
    renderForm(response({ limits: GROUP_LIMITS }));
    mockSave.mockResolvedValueOnce(response({ limits: GROUP_LIMITS, enabled: false }));

    fireEvent.click(enforceSwitch());
    fireEvent.click(saveButton());
    await waitFor(() => expect(enforceSwitch()).not.toBeChecked());

    fireEvent.click(enforceSwitch());
    expect(input('automatic_investigation')).toHaveValue(4);
    expect(input('manual_investigation')).toHaveValue(6);
    expect(input('total_investigation')).toHaveValue(9);
  });

  it('edits a single unlimited limit, where an empty input means no limit', async () => {
    renderForm(
      response({
        limits: {
          automatic_investigation: null,
          manual_investigation: 5,
          total_investigation: 10,
        },
      })
    );

    expect(input('automatic_investigation')).toHaveValue(null);
    fireEvent.change(input('automatic_investigation'), { target: { value: '7' } });
    fireEvent.change(input('manual_investigation'), { target: { value: '' } });
    fireEvent.click(saveButton());

    await waitFor(() =>
      expect(mockSave).toHaveBeenCalledWith({
        limits: { automatic_investigation: 7, manual_investigation: null },
      })
    );
  });

  it('does not accept a limit of 0 in the input', () => {
    renderForm();

    fireEvent.change(input('automatic_investigation'), { target: { value: '0' } });

    expect(input('automatic_investigation')).toHaveValue(30);
    expect(screen.queryByTestId('streams-significant-events-settings-bottom-bar')).toBeNull();
  });

  it('keeps the inputs while the last finite limit is cleared', () => {
    renderForm(
      response({
        limits: {
          automatic_investigation: 4,
          manual_investigation: null,
          total_investigation: null,
        },
      })
    );

    fireEvent.change(input('automatic_investigation'), { target: { value: '' } });

    expect(enforceSwitch()).toBeChecked();
    expect(input('automatic_investigation')).toHaveValue(null);
    fireEvent.change(input('automatic_investigation'), { target: { value: '6' } });
    expect(input('automatic_investigation')).toHaveValue(6);
  });

  it('brings back an unlimited limit as unlimited when the switch is turned back on', async () => {
    const limits = { ...GROUP_LIMITS, automatic_investigation: null };
    renderForm(response({ limits }));
    mockSave.mockResolvedValueOnce(response({ limits, enabled: false }));
    const values = () =>
      ['automatic_investigation', 'manual_investigation', 'total_investigation'].map((group) => {
        const element = input(group);
        return element instanceof HTMLInputElement ? element.value : undefined;
      });

    fireEvent.click(enforceSwitch());
    fireEvent.click(enforceSwitch());
    expect(values()).toEqual(['', '6', '9']);

    fireEvent.click(enforceSwitch());
    fireEvent.click(saveButton());
    await waitFor(() => expect(enforceSwitch()).not.toBeChecked());
    fireEvent.click(enforceSwitch());
    expect(values()).toEqual(['', '6', '9']);
  });

  it('cancels changes through the save bar', () => {
    renderForm();
    fireEvent.change(input('automatic_investigation'), { target: { value: '20' } });

    expect(
      screen.getByTestId('streams-significant-events-settings-bottom-bar')
    ).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('streams-settings-cancel-button'));

    expect(input('automatic_investigation')).toHaveValue(30);
    expect(
      screen.queryByTestId('streams-significant-events-settings-bottom-bar')
    ).not.toBeInTheDocument();
  });

  it('validates limits locally before saving', () => {
    renderForm();

    fireEvent.change(input('automatic_investigation'), { target: { value: '1.5' } });

    expect(screen.getByText(/Enter a whole number from 1 to/)).toBeInTheDocument();
    expect(saveButton()).toBeDisabled();
    expect(mockSave).not.toHaveBeenCalled();
  });

  it('warns before lowering a limit to the current count, then saves when confirmed', async () => {
    const { rerender } = renderForm(
      response({
        counts: { automatic_investigation: 20, manual_investigation: 0, total_investigation: 20 },
      })
    );
    fireEvent.change(input('automatic_investigation'), { target: { value: '20' } });
    fireEvent.click(saveButton());

    expect(await screen.findByText('Lower limits to values already reached?')).toBeInTheDocument();
    expect(mockSave).not.toHaveBeenCalled();

    mockIsSaving = true;
    rerenderForm(rerender);
    expect(screen.getByRole('button', { name: 'Save lower limits' })).toBeDisabled();

    mockIsSaving = false;
    rerenderForm(rerender);
    fireEvent.click(screen.getByRole('button', { name: 'Save lower limits' }));

    await waitFor(() =>
      expect(mockSave).toHaveBeenCalledWith({ limits: { automatic_investigation: 20 } })
    );
  });

  it('warns when changing an unlimited limit to a finite one that is already reached', async () => {
    renderForm(
      response({
        counts: { automatic_investigation: 3, manual_investigation: 8, total_investigation: 11 },
      })
    );

    fireEvent.change(input('manual_investigation'), { target: { value: '8' } });
    fireEvent.click(saveButton());

    expect(await screen.findByText('Lower limits to values already reached?')).toBeInTheDocument();
    expect(mockSave).not.toHaveBeenCalled();
  });

  it('saves a lower limit that the count has not reached without asking', async () => {
    renderForm();

    fireEvent.change(input('automatic_investigation'), { target: { value: '10' } });
    fireEvent.click(saveButton());

    await waitFor(() =>
      expect(mockSave).toHaveBeenCalledWith({ limits: { automatic_investigation: 10 } })
    );
    expect(screen.queryByText('Lower limits to values already reached?')).not.toBeInTheDocument();
  });

  describe('exhaustion callouts', () => {
    const reached = (overrides: Partial<InvestigationQuotasResponse> = {}) =>
      response({
        counts: { automatic_investigation: 30, manual_investigation: 0, total_investigation: 30 },
        ...overrides,
      });

    it('keeps the active callout while a raised limit is unsaved', () => {
      renderForm(reached());
      expect(
        screen.getByTestId('nightshiftRunLimitsBanner-automatic_investigation')
      ).toBeInTheDocument();

      fireEvent.change(input('automatic_investigation'), { target: { value: '31' } });

      expect(
        screen.getByTestId('nightshiftRunLimitsBanner-automatic_investigation')
      ).toBeInTheDocument();
    });

    it('opens the automations page from the automatic limit callout', () => {
      renderForm(reached());

      const callout = screen.getByTestId('nightshiftRunLimitsBanner-automatic_investigation');
      expect(callout).toHaveTextContent(
        'Automations reached a daily run limit of 30 for this deployment'
      );
      expect(callout).not.toHaveTextContent('You can still trigger investigations manually');
      fireEvent.click(screen.getByTestId('nightshiftRunLimitsOpenAutomations'));

      expect(mockNavigateToUrl).toHaveBeenCalledWith('/app/nightshift/automations');
    });

    it('hides the automations button when automations are unavailable', () => {
      mockAutomationsAvailable = false;
      renderForm(reached());

      expect(
        screen.getByTestId('nightshiftRunLimitsBanner-automatic_investigation')
      ).toBeInTheDocument();
      expect(screen.queryByTestId('nightshiftRunLimitsOpenAutomations')).not.toBeInTheDocument();
    });

    it('explains the manual and all-investigations limits when they are reached', () => {
      renderForm(
        response({
          limits: {
            automatic_investigation: 30,
            manual_investigation: 5,
            total_investigation: 8,
          },
          counts: { automatic_investigation: 3, manual_investigation: 5, total_investigation: 8 },
        })
      );

      expect(
        screen.queryByTestId('nightshiftRunLimitsBanner-automatic_investigation')
      ).not.toBeInTheDocument();
      const manual = screen.getByTestId('nightshiftRunLimitsBanner-manual_investigation');
      expect(manual).toHaveTextContent(
        'Manual investigations reached a daily limit of 5 for this deployment'
      );
      expect(manual).not.toHaveTextContent('Open automations');
      expect(screen.getByTestId('nightshiftRunLimitsBanner-total_investigation')).toHaveTextContent(
        'Investigations reached a daily limit of 8 for this deployment'
      );
    });

    it('shows no callout for a limit that is unlimited', () => {
      renderForm(
        response({
          limits: {
            automatic_investigation: null,
            manual_investigation: null,
            total_investigation: null,
          },
          counts: {
            automatic_investigation: 50,
            manual_investigation: 50,
            total_investigation: 100,
          },
        })
      );

      expect(screen.queryByTestId(/^nightshiftRunLimitsBanner-/)).not.toBeInTheDocument();
    });

    it('shows no callout while the limits are not enforced', () => {
      renderForm(reached({ enabled: false }));

      expect(screen.queryByTestId(/^nightshiftRunLimitsBanner-/)).not.toBeInTheDocument();
    });
  });

  it('shows the UTC reset value supplied by the API window', () => {
    renderForm(
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

  it('takes a background update after an unlimited input was typed in and cleared again', () => {
    const limits = { ...GROUP_LIMITS, manual_investigation: null };
    const { rerender } = renderForm(response({ limits }));
    fireEvent.change(input('manual_investigation'), { target: { value: '3' } });
    fireEvent.change(input('manual_investigation'), { target: { value: '' } });

    setQuotas(response({ limits: { ...limits, manual_investigation: 7 } }));
    rerenderForm(rerender);

    expect(input('manual_investigation')).toHaveValue(7);
  });

  it('retains a dirty draft when the query receives a background update', () => {
    const { rerender } = renderForm();
    fireEvent.change(input('automatic_investigation'), { target: { value: '80' } });

    setQuotas(
      response({
        limits: {
          automatic_investigation: 90,
          manual_investigation: null,
          total_investigation: null,
        },
        counts: { automatic_investigation: 8, manual_investigation: 0, total_investigation: 8 },
      })
    );
    rerenderForm(rerender);

    expect(input('automatic_investigation')).toHaveValue(80);
    expect(screen.getByTestId('nightshiftRunLimitCount-automatic_investigation')).toHaveTextContent(
      '8 investigations started today'
    );
  });

  it('retains the draft and shows an actionable error after a failed write', async () => {
    renderForm();
    mockSave.mockRejectedValueOnce(new Error('server unavailable'));
    fireEvent.change(input('automatic_investigation'), { target: { value: '80' } });
    fireEvent.click(saveButton());

    expect(await screen.findByText('Could not save daily run limits')).toBeInTheDocument();
    expect(screen.getByText(/server unavailable/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
    expect(input('automatic_investigation')).toHaveValue(80);
  });

  it('offers a retry when the limits cannot be loaded', () => {
    mockQuotas = { data: undefined, isLoading: false, isError: true, refetch: mockRefetch };
    render(
      <I18nProvider>
        <TestForm />
      </I18nProvider>
    );

    fireEvent.click(screen.getByTestId('nightshiftRunLimitsSectionRetryButton'));

    expect(screen.getByText('Could not load daily run limits')).toBeInTheDocument();
    expect(mockRefetch).toHaveBeenCalledTimes(1);
  });
});
