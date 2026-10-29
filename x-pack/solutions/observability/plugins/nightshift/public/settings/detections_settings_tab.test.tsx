/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { DEFAULT_SIGNIFICANT_EVENTS_TUNING_CONFIG } from '@kbn/significant-events-schema';
import { useKibana } from '../hooks/use_kibana';
import { DetectionsSettingsTab } from './detections_settings_tab';
import { useDeveloperMode } from '../hooks/use_developer_mode';

const mockContinuousSave = jest.fn();
const mockRunLimitsRequestSave = jest.fn();
const mockRunLimitsConfirmAndSave = jest.fn();
const mockRunLimitsCancel = jest.fn();
const mockTokenTrackingSave = jest.fn();
const mockTokenTrackingCancel = jest.fn();
let mockContinuousHasChanged = false;
let mockRunLimitsIsDirty = false;
let mockTokenTrackingIsDirty = false;
let mockBlocksActivity = false;

jest.mock('@kbn/unsaved-changes-prompt', () => ({
  useUnsavedChangesPrompt: jest.fn(),
}));
jest.mock('../hooks/use_kibana');
jest.mock('../hooks/use_developer_mode');
jest.mock('../data/maintenance/use_significant_events_maintenance', () => ({
  useBlocksNewActivity: () => ({
    blocksActivity: mockBlocksActivity,
    isBlocked: mockBlocksActivity,
    status: undefined,
    activityBlockTooltip: mockBlocksActivity
      ? 'Resume activity to save these settings.'
      : undefined,
  }),
  useMaintenanceStatus: () => ({ data: undefined }),
  useSignificantEventsMaintenanceActions: () => ({
    reset: jest.fn(),
    isResetting: false,
    isMutating: false,
  }),
}));
jest.mock('./components/use_continuous_extraction_settings', () => ({
  useContinuousExtractionSettings: () => ({
    draft: { enabled: false, intervalHours: 24 },
    setDraft: jest.fn(),
    hasChanged: mockContinuousHasChanged,
    reset: jest.fn(),
    save: mockContinuousSave,
  }),
}));
jest.mock('./components/use_scheduled_discovery_settings', () => ({
  useScheduledDiscoverySettings: () => ({
    draft: {
      enabled: false,
      detectionIntervalMinutes: 30,
      targetCoverageMinutes: 30,
      reviewIntervalMinutes: 10,
      discoveryBatchSize: 3,
      maxReviewPasses: 3,
    },
    setDraft: jest.fn(),
    hasChanged: false,
    reset: jest.fn(),
    save: jest.fn(),
  }),
}));
jest.mock('./components/maintenance_section', () => ({
  MaintenanceSection: () => <div data-test-subj="maintenance-section" />,
}));
jest.mock('./components/stale_event_cleanup_section', () => ({
  StaleEventCleanupSection: () => <div data-test-subj="stale-event-cleanup-section" />,
}));
jest.mock('./components/cost_estimate', () => ({
  CostEstimate: () => <div data-test-subj="cost-estimate" />,
}));
jest.mock('./components/use_token_tracking_form', () => ({
  useTokenTrackingForm: () => ({
    enabled: true,
    savedEnabled: true,
    canEdit: true,
    isDirty: mockTokenTrackingIsDirty,
    isSaving: false,
    updateEnabled: jest.fn(),
    save: mockTokenTrackingSave,
    cancel: mockTokenTrackingCancel,
  }),
}));
jest.mock('./components/run_limits_section', () => ({
  RunLimitsSection: ({ onConfirmSave }: { onConfirmSave: () => Promise<void> }) => (
    <>
      <button data-test-subj="runLimitsConfirmStub" onClick={() => void onConfirmSave()}>
        Confirm run limits
      </button>
    </>
  ),
}));
jest.mock('./components/use_run_limits_form', () => ({
  useRunLimitsForm: () => ({
    isDirty: mockRunLimitsIsDirty,
    isSaving: false,
    canManage: true,
    update: mockRunLimitsIsDirty ? { limits: { detection: 10 } } : undefined,
    requestSave: mockRunLimitsRequestSave,
    confirmAndSave: mockRunLimitsConfirmAndSave,
    cancel: mockRunLimitsCancel,
  }),
}));
jest.mock('./components/significant_events_tuning_config_editor', () => ({
  configToAnnotatedYaml: (config: unknown) => JSON.stringify(config),
  SignificantEventsTuningConfigEditor: ({
    value,
    onChange,
    isReadOnly,
  }: {
    value: string;
    onChange: (yaml: string, parsed: object | null) => void;
    isReadOnly: boolean;
  }) => (
    <textarea
      data-test-subj="streams-settings-tuning-editor"
      value={value}
      disabled={isReadOnly}
      onChange={(event) => onChange(event.target.value, {})}
    />
  ),
}));

const mockUseKibana = useKibana as jest.MockedFunction<typeof useKibana>;
const mockUseDeveloperMode = useDeveloperMode as jest.MockedFunction<typeof useDeveloperMode>;

const setDeveloperMode = jest.fn();

const setup = ({
  isDeveloperMode = false,
  isSaving = false,
  canSaveAdvancedSettings = true,
  tuningConfig = {},
}: {
  isDeveloperMode?: boolean;
  isSaving?: boolean;
  canSaveAdvancedSettings?: boolean;
  tuningConfig?: unknown;
} = {}) => {
  mockUseDeveloperMode.mockReturnValue({
    isDeveloperMode,
    isSaving,
    setDeveloperMode,
  });
  mockUseKibana.mockReturnValue({
    services: {
      application: {
        navigateToUrl: jest.fn(),
        capabilities: {
          nightshift: {
            show: true,
            manage: true,
            configure: true,
          },
          advancedSettings: {
            save: canSaveAdvancedSettings,
          },
          streams: {
            manage: true,
          },
        },
      },
      http: {},
      overlays: {
        openConfirm: jest.fn(),
      },
      settings: {
        client: {
          get: jest.fn().mockReturnValue('logs-*'),
        },
        globalClient: {
          get: jest.fn().mockReturnValue(tuningConfig),
        },
      },
      notifications: {
        toasts: {
          addDanger: jest.fn(),
        },
      },
      appParams: {
        history: {},
      },
    },
  } as never);

  return render(
    <I18nProvider>
      <DetectionsSettingsTab />
    </I18nProvider>
  );
};

describe('DetectionsSettingsTab', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockContinuousHasChanged = false;
    mockRunLimitsIsDirty = false;
    mockTokenTrackingIsDirty = false;
    mockBlocksActivity = false;
    mockContinuousSave.mockResolvedValue(undefined);
    mockRunLimitsRequestSave.mockResolvedValue('saved');
    mockRunLimitsConfirmAndSave.mockResolvedValue('saved');
    mockTokenTrackingSave.mockResolvedValue('saved');
  });

  it('saves run limits, activity settings, and token tracking through one bottom bar', async () => {
    mockRunLimitsIsDirty = true;
    mockContinuousHasChanged = true;
    mockTokenTrackingIsDirty = true;
    setup({ isDeveloperMode: true });

    fireEvent.click(screen.getByTestId('streams-settings-save-button'));

    await waitFor(() => {
      expect(mockRunLimitsRequestSave).toHaveBeenCalledTimes(1);
      expect(mockContinuousSave).toHaveBeenCalledTimes(1);
      expect(mockTokenTrackingSave).toHaveBeenCalledTimes(1);
    });
    expect(mockRunLimitsRequestSave.mock.invocationCallOrder[0]).toBeLessThan(
      mockContinuousSave.mock.invocationCallOrder[0]
    );
    expect(mockContinuousSave.mock.invocationCallOrder[0]).toBeLessThan(
      mockTokenTrackingSave.mock.invocationCallOrder[0]
    );
  });

  it('stops the save sequence when activity settings fail', async () => {
    mockRunLimitsIsDirty = true;
    mockContinuousHasChanged = true;
    mockTokenTrackingIsDirty = true;
    mockContinuousSave.mockRejectedValue(new Error('activity save failed'));
    setup({ isDeveloperMode: true });

    fireEvent.click(screen.getByTestId('streams-settings-save-button'));

    await waitFor(() => {
      expect(mockRunLimitsRequestSave).toHaveBeenCalledTimes(1);
      expect(mockContinuousSave).toHaveBeenCalledTimes(1);
    });
    expect(mockTokenTrackingSave).not.toHaveBeenCalled();
  });

  it('waits for run-limit confirmation before saving the remaining settings', async () => {
    mockRunLimitsIsDirty = true;
    mockContinuousHasChanged = true;
    mockTokenTrackingIsDirty = true;
    mockRunLimitsRequestSave.mockResolvedValue('needs-confirmation');
    setup({ isDeveloperMode: true });

    fireEvent.click(screen.getByTestId('streams-settings-save-button'));

    await waitFor(() => expect(mockRunLimitsRequestSave).toHaveBeenCalledTimes(1));
    expect(mockContinuousSave).not.toHaveBeenCalled();
    expect(mockTokenTrackingSave).not.toHaveBeenCalled();

    fireEvent.click(screen.getByTestId('runLimitsConfirmStub'));

    await waitFor(() => {
      expect(mockRunLimitsConfirmAndSave).toHaveBeenCalledTimes(1);
      expect(mockContinuousSave).toHaveBeenCalledTimes(1);
      expect(mockTokenTrackingSave).toHaveBeenCalledTimes(1);
    });
  });

  it('allows a run-limit-only save while detection activity is paused', () => {
    mockRunLimitsIsDirty = true;
    mockBlocksActivity = true;
    setup();

    expect(screen.getByTestId('streams-settings-save-button')).toBeEnabled();
  });

  it('blocks a combined save while dirty activity settings are paused', () => {
    mockRunLimitsIsDirty = true;
    mockContinuousHasChanged = true;
    mockBlocksActivity = true;
    setup();

    expect(screen.getByTestId('streams-settings-save-button')).toHaveAttribute(
      'aria-disabled',
      'true'
    );
  });

  it('uses the defaults when the stored tuning configuration is invalid', () => {
    setup({
      isDeveloperMode: true,
      tuningConfig: JSON.stringify({ rrf_rank_constant: 999 }),
    });

    fireEvent.click(screen.getByTestId('nightshiftSettingsTuningEditButton'));

    expect(screen.getByTestId('streams-settings-tuning-editor')).toHaveValue(
      JSON.stringify(DEFAULT_SIGNIFICANT_EVENTS_TUNING_CONFIG)
    );
  });

  it('reverts a dirty YAML draft when developer mode turns off', () => {
    const { rerender } = setup({ isDeveloperMode: true });
    fireEvent.click(screen.getByTestId('nightshiftSettingsTuningEditButton'));
    const savedYaml = (screen.getByTestId('streams-settings-tuning-editor') as HTMLTextAreaElement)
      .value;

    fireEvent.change(screen.getByTestId('streams-settings-tuning-editor'), {
      target: { value: 'rrf_rank_constant: 10' },
    });
    expect(screen.getByTestId('streams-settings-tuning-editor')).not.toHaveValue(savedYaml);
    expect(
      screen.queryByTestId('streams-significant-events-settings-bottom-bar')
    ).not.toBeInTheDocument();

    mockUseDeveloperMode.mockReturnValue({
      isDeveloperMode: false,
      isSaving: false,
      setDeveloperMode,
    });
    rerender(
      <I18nProvider>
        <DetectionsSettingsTab />
      </I18nProvider>
    );

    expect(screen.queryByTestId('nightshiftSettingsTuningPanel')).not.toBeInTheDocument();
    expect(
      screen.queryByTestId('streams-significant-events-settings-bottom-bar')
    ).not.toBeInTheDocument();

    mockUseDeveloperMode.mockReturnValue({
      isDeveloperMode: true,
      isSaving: false,
      setDeveloperMode,
    });
    rerender(
      <I18nProvider>
        <DetectionsSettingsTab />
      </I18nProvider>
    );

    fireEvent.click(screen.getByTestId('nightshiftSettingsTuningEditButton'));
    expect(screen.getByTestId('streams-settings-tuning-editor')).toHaveValue(savedYaml);
    expect(
      screen.queryByTestId('streams-significant-events-settings-bottom-bar')
    ).not.toBeInTheDocument();
  });

  it('preserves a dirty YAML draft when developer-mode disable rolls back after a failed save', () => {
    const { rerender } = setup({ isDeveloperMode: true });
    fireEvent.click(screen.getByTestId('nightshiftSettingsTuningEditButton'));

    fireEvent.change(screen.getByTestId('streams-settings-tuning-editor'), {
      target: { value: 'rrf_rank_constant: 10' },
    });

    mockUseDeveloperMode.mockReturnValue({
      isDeveloperMode: false,
      isSaving: true,
      setDeveloperMode,
    });
    rerender(
      <I18nProvider>
        <DetectionsSettingsTab />
      </I18nProvider>
    );

    mockUseDeveloperMode.mockReturnValue({
      isDeveloperMode: true,
      isSaving: false,
      setDeveloperMode,
    });
    rerender(
      <I18nProvider>
        <DetectionsSettingsTab />
      </I18nProvider>
    );

    fireEvent.click(screen.getByTestId('nightshiftSettingsTuningEditButton'));
    expect(screen.getByTestId('streams-settings-tuning-editor')).toHaveValue(
      'rrf_rank_constant: 10'
    );
  });
});
