/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_TUNING_CONFIG } from '@kbn/management-settings-ids';
import { DEFAULT_SIGNIFICANT_EVENTS_TUNING_CONFIG } from '@kbn/significant-events-schema';
import { useUnsavedChangesPrompt } from '@kbn/unsaved-changes-prompt';
import { useKibana } from '../hooks/use_kibana';
import { DetectionsSettingsTab } from './detections_settings_tab';
import { useDeveloperMode } from './hooks/use_developer_mode';

const mockContinuousSave = jest.fn();
let mockContinuousHasChanged = false;
let mockScheduledEnabled = false;

jest.mock('@kbn/unsaved-changes-prompt', () => ({
  useUnsavedChangesPrompt: jest.fn(),
}));
jest.mock('../hooks/use_kibana');
jest.mock('./hooks/use_developer_mode');
jest.mock('./hooks/use_significant_events_maintenance', () => ({
  useBlocksNewActivity: () => ({
    blocksActivity: false,
    isBlocked: false,
    status: undefined,
    activityBlockTooltip: undefined,
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
      enabled: mockScheduledEnabled,
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
jest.mock('./components/run_limits_section', () => ({
  RunLimitsSection: ({
    onUnsavedChangesChange,
  }: {
    onUnsavedChangesChange: (hasUnsavedChanges: boolean) => void;
  }) => (
    <button
      data-test-subj="runLimitsUnsavedChangesStub"
      onClick={() => onUnsavedChangesChange(true)}
    >
      Change run limits
    </button>
  ),
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
const mockUseUnsavedChangesPrompt = useUnsavedChangesPrompt as jest.MockedFunction<
  typeof useUnsavedChangesPrompt
>;

const setDeveloperMode = jest.fn();
const settingsGlobalClientSet = jest.fn();

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
          set: settingsGlobalClientSet,
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

describe('DetectionsSettingsTab developer mode', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockContinuousHasChanged = false;
    mockScheduledEnabled = false;
    mockContinuousSave.mockResolvedValue(undefined);
    settingsGlobalClientSet.mockResolvedValue(true);
  });

  it('persists the developer mode switch immediately', () => {
    setup({ isDeveloperMode: false });

    fireEvent.click(screen.getByTestId('nightshiftDeveloperModeSwitch'));

    expect(setDeveloperMode).toHaveBeenCalledWith(true);
  });

  it('includes run-limit drafts in the unsaved-changes prompt', () => {
    setup();

    fireEvent.click(screen.getByTestId('runLimitsUnsavedChangesStub'));

    expect(mockUseUnsavedChangesPrompt).toHaveBeenLastCalledWith(
      expect.objectContaining({ hasUnsavedChanges: true })
    );
  });

  it('hides the tuning YAML panel by default', () => {
    setup({ isDeveloperMode: false });

    expect(screen.queryByTestId('nightshiftSettingsTuningPanel')).not.toBeInTheDocument();
    expect(screen.queryByTestId('streams-settings-tuning-editor')).not.toBeInTheDocument();
  });

  it('hides stale event cleanup and the cost estimate when developer mode is off', () => {
    setup({ isDeveloperMode: false });

    expect(screen.queryByTestId('stale-event-cleanup-section')).not.toBeInTheDocument();
    expect(screen.queryByTestId('cost-estimate')).not.toBeInTheDocument();
  });

  it('shows stale event cleanup and the cost estimate when developer mode is on', () => {
    setup({ isDeveloperMode: true });

    expect(screen.getByTestId('stale-event-cleanup-section')).toBeInTheDocument();
    expect(screen.getByTestId('cost-estimate')).toBeInTheDocument();
  });

  it('opens the tuning flyout and shows the Dev badge when developer mode is on', () => {
    setup({ isDeveloperMode: true });

    expect(screen.getByTestId('nightshiftSettingsTuningPanel')).toBeInTheDocument();
    expect(screen.queryByTestId('streams-settings-tuning-editor')).not.toBeInTheDocument();
    const editButton = screen.getByTestId('nightshiftSettingsTuningEditButton');
    expect(editButton.querySelector('[data-euiicon-type="pencil"]')).toBeInTheDocument();
    fireEvent.click(editButton);
    expect(screen.getByTestId('nightshiftSettingsTuningFlyout')).toBeInTheDocument();
    expect(screen.getByTestId('streams-settings-tuning-editor')).toBeInTheDocument();
    expect(screen.getByTestId('nightshiftAdvancedDeveloperSettingsSection')).toHaveTextContent(
      'Dev'
    );
  });

  it('uses the defaults when the stored tuning configuration is invalid', () => {
    setup({
      isDeveloperMode: true,
      tuningConfig: JSON.stringify({ sample_size: 999 }),
    });

    fireEvent.click(screen.getByTestId('nightshiftSettingsTuningEditButton'));

    expect(screen.getByTestId('streams-settings-tuning-editor')).toHaveValue(
      JSON.stringify(DEFAULT_SIGNIFICANT_EVENTS_TUNING_CONFIG)
    );
  });

  it('saves tuning changes from the flyout without showing the page save bar', async () => {
    setup({ isDeveloperMode: true });
    fireEvent.click(screen.getByTestId('nightshiftSettingsTuningEditButton'));

    fireEvent.change(screen.getByTestId('streams-settings-tuning-editor'), {
      target: { value: 'sample_size: 99' },
    });

    expect(
      screen.queryByTestId('streams-significant-events-settings-bottom-bar')
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('nightshiftSettingsTuningSaveButton'));

    await waitFor(() => {
      expect(settingsGlobalClientSet).toHaveBeenCalledWith(
        OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_TUNING_CONFIG,
        expect.any(String)
      );
      expect(screen.queryByTestId('nightshiftSettingsTuningFlyout')).not.toBeInTheDocument();
    });
  });

  it('discards tuning changes when the flyout is closed', () => {
    setup({ isDeveloperMode: true });
    fireEvent.click(screen.getByTestId('nightshiftSettingsTuningEditButton'));
    const savedYaml = (screen.getByTestId('streams-settings-tuning-editor') as HTMLTextAreaElement)
      .value;

    fireEvent.change(screen.getByTestId('streams-settings-tuning-editor'), {
      target: { value: 'sample_size: 99' },
    });
    fireEvent.click(screen.getByTestId('euiFlyoutCloseButton'));

    expect(screen.queryByTestId('nightshiftSettingsTuningFlyout')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('nightshiftSettingsTuningEditButton'));
    expect(screen.getByTestId('streams-settings-tuning-editor')).toHaveValue(savedYaml);
  });

  it('disables the switch without advancedSettings.save', () => {
    setup({ canSaveAdvancedSettings: false });

    expect(screen.getByTestId('nightshiftDeveloperModeSwitch')).toBeDisabled();
  });

  it('disables the switch while a save is in flight', () => {
    setup({ isSaving: true });

    expect(screen.getByTestId('nightshiftDeveloperModeSwitch')).toBeDisabled();
  });

  it('reverts a dirty YAML draft when developer mode turns off', () => {
    const { rerender } = setup({ isDeveloperMode: true });
    fireEvent.click(screen.getByTestId('nightshiftSettingsTuningEditButton'));
    const savedYaml = (screen.getByTestId('streams-settings-tuning-editor') as HTMLTextAreaElement)
      .value;

    fireEvent.change(screen.getByTestId('streams-settings-tuning-editor'), {
      target: { value: 'sample_size: 99' },
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
      target: { value: 'sample_size: 99' },
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
    expect(screen.getByTestId('streams-settings-tuning-editor')).toHaveValue('sample_size: 99');
  });

  it('keeps advanced schedule fields collapsed until requested', () => {
    mockScheduledEnabled = true;
    setup();

    const advancedSettings = screen.getByTestId(
      'streams-settings-scheduled-discovery-advanced-settings'
    );
    expect(advancedSettings).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(advancedSettings);

    expect(advancedSettings).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByTestId('streams-settings-scheduled-detection-interval')).toBeVisible();
  });

  it('hides the tuning panel and disables save while developer mode is saving', () => {
    mockContinuousHasChanged = true;
    const { rerender } = setup({ isDeveloperMode: true });

    expect(screen.getByTestId('streams-settings-save-button')).toBeEnabled();

    mockUseDeveloperMode.mockReturnValue({
      isDeveloperMode: true,
      isSaving: true,
      setDeveloperMode,
    });
    rerender(
      <I18nProvider>
        <DetectionsSettingsTab />
      </I18nProvider>
    );

    expect(screen.queryByTestId('nightshiftSettingsTuningPanel')).not.toBeInTheDocument();
    expect(screen.getByTestId('streams-settings-save-button')).toBeDisabled();
  });

  it('disables the developer mode switch while settings are saving', async () => {
    mockContinuousHasChanged = true;
    setup({ isDeveloperMode: true });

    let resolveSet: () => void = () => undefined;
    mockContinuousSave.mockReturnValue(
      new Promise<void>((resolve) => {
        resolveSet = resolve;
      })
    );

    fireEvent.click(screen.getByTestId('streams-settings-save-button'));

    await waitFor(() => {
      expect(screen.getByTestId('nightshiftDeveloperModeSwitch')).toBeDisabled();
    });

    resolveSet();
    await waitFor(() => {
      expect(screen.getByTestId('nightshiftDeveloperModeSwitch')).toBeEnabled();
    });
  });
});
