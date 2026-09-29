/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { MockedFunction } from 'vitest';

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { BehaviorSubject } from 'rxjs';
import { useKibana } from '../../../../hooks/use_kibana';
import { useDeveloperMode } from '../../../../hooks/use_developer_mode';
import { SettingsTab } from './tab';

vi.mock('../../../../hooks/use_kibana');
vi.mock('../../../../hooks/use_developer_mode');
vi.mock('../../../../hooks/use_model_settings_url', () => {
  const mocked = {
    useModelSettingsUrl: () => undefined,
  };
  return { ...mocked, default: mocked };
});
vi.mock('../../../../hooks/use_significant_events_maintenance', () => {
  const mocked = {
    useBlocksNewActivity: () => ({
      blocksActivity: false,
      isBlocked: false,
      status: undefined,
      activityBlockTooltip: undefined,
    }),
  };
  return { ...mocked, default: mocked };
});
vi.mock('../../hooks/use_fetch_streams', () => {
  const mocked = {
    useFetchStreams: () => ({ data: { streams: [] } }),
  };
  return { ...mocked, default: mocked };
});
vi.mock('./use_continuous_extraction_settings', () => {
  const mocked = {
    useContinuousExtractionSettings: () => ({
      draft: { enabled: false, intervalHours: 24 },
      setDraft: vi.fn(),
      hasChanged: false,
      reset: vi.fn(),
      save: vi.fn(),
    }),
  };
  return { ...mocked, default: mocked };
});
vi.mock('./use_scheduled_discovery_settings', () => {
  const mocked = {
    useScheduledDiscoverySettings: () => ({
      draft: {
        enabled: false,
        detectionIntervalMinutes: 30,
        targetCoverageMinutes: 30,
        reviewIntervalMinutes: 10,
        discoveryBatchSize: 3,
        maxReviewPasses: 3,
      },
      setDraft: vi.fn(),
      hasChanged: false,
      reset: vi.fn(),
      save: vi.fn(),
    }),
  };
  return { ...mocked, default: mocked };
});
vi.mock('./maintenance_section', () => {
  const mocked = {
    MaintenanceSection: () => <div data-test-subj="maintenance-section" />,
  };
  return { ...mocked, default: mocked };
});
vi.mock('./stale_event_cleanup_section', () => {
  const mocked = {
    StaleEventCleanupSection: () => <div data-test-subj="stale-event-cleanup-section" />,
  };
  return { ...mocked, default: mocked };
});
vi.mock('./cost_estimate', () => {
  const mocked = {
    CostEstimate: () => <div data-test-subj="cost-estimate" />,
  };
  return { ...mocked, default: mocked };
});
vi.mock('./run_limits_section', () => {
  const mocked = {
    RunLimitsSection: () => null,
  };
  return { ...mocked, default: mocked };
});
vi.mock('./apps_section', () => {
  const mocked = {
    AppsSection: () => null,
  };
  return { ...mocked, default: mocked };
});
vi.mock('./significant_events_tuning_config_editor', () => {
  const mocked = {
    configToAnnotatedYaml: (config: unknown) => JSON.stringify(config),
    SignificantEventsTuningConfigEditor: ({
      value,
      onChange,
      isReadOnly,
    }: {
      value: string;
      onChange: (yaml: string, parsed: null) => void;
      isReadOnly: boolean;
    }) => (
      <textarea
        data-test-subj="streams-settings-tuning-editor"
        value={value}
        disabled={isReadOnly}
        onChange={(event) => onChange(event.target.value, null)}
      />
    ),
  };
  return { ...mocked, default: mocked };
});

const mockUseKibana = useKibana as MockedFunction<typeof useKibana>;
const mockUseDeveloperMode = useDeveloperMode as MockedFunction<typeof useDeveloperMode>;

const setDeveloperMode = vi.fn();
const settingsClientSet = vi.fn();
const settingsGlobalClientSet = vi.fn();

const setup = ({
  isDeveloperMode = false,
  isSaving = false,
  canSaveAdvancedSettings = true,
}: {
  isDeveloperMode?: boolean;
  isSaving?: boolean;
  canSaveAdvancedSettings?: boolean;
} = {}) => {
  mockUseDeveloperMode.mockReturnValue({
    isDeveloperMode,
    isSaving,
    setDeveloperMode,
  });
  mockUseKibana.mockReturnValue({
    core: {
      application: {
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
      settings: {
        client: {
          get: vi.fn().mockReturnValue('logs-*'),
          set: settingsClientSet,
        },
        globalClient: {
          get: vi.fn().mockReturnValue({}),
          set: settingsGlobalClientSet,
        },
      },
      featureFlags: {
        getBooleanValue$: vi.fn().mockReturnValue(new BehaviorSubject(false)),
      },
      notifications: {
        toasts: {
          addDanger: vi.fn(),
        },
      },
    },
  } as never);

  return render(
    <I18nProvider>
      <SettingsTab />
    </I18nProvider>
  );
};

describe('SettingsTab developer mode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    settingsClientSet.mockResolvedValue(true);
    settingsGlobalClientSet.mockResolvedValue(true);
  });

  it('persists the developer mode switch immediately', () => {
    setup({ isDeveloperMode: false });

    fireEvent.click(screen.getByTestId('nightshiftDeveloperModeSwitch'));

    expect(setDeveloperMode).toHaveBeenCalledWith(true);
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

  it('shows the tuning YAML panel and Dev badge when developer mode is on', () => {
    setup({ isDeveloperMode: true });

    expect(screen.getByTestId('nightshiftSettingsTuningPanel')).toBeInTheDocument();
    expect(screen.getByTestId('streams-settings-tuning-editor')).toBeInTheDocument();
    expect(screen.getAllByTestId('nightshiftDeveloperModeBadge').length).toBeGreaterThan(0);
    expect(screen.getByTestId('nightshiftSettingsTuningPanel')).toHaveTextContent('Dev');
  });

  it('disables the switch without advancedSettings.save', () => {
    setup({ canSaveAdvancedSettings: false });

    expect(screen.getByTestId('nightshiftDeveloperModeSwitch')).toBeDisabled();
  });

  it('disables the switch while a save is in flight', () => {
    setup({ isSaving: true });

    expect(screen.getByTestId('nightshiftDeveloperModeSwitch')).toBeDisabled();
  });

  it('reverts a dirty YAML draft and drops it from the save bar when developer mode turns off', () => {
    const { rerender } = setup({ isDeveloperMode: true });
    const savedYaml = (screen.getByTestId('streams-settings-tuning-editor') as HTMLTextAreaElement)
      .value;

    fireEvent.change(screen.getByTestId('streams-settings-tuning-editor'), {
      target: { value: 'sample_size: 99' },
    });
    expect(screen.getByTestId('streams-settings-tuning-editor')).not.toHaveValue(savedYaml);
    expect(
      screen.getByTestId('streams-significant-events-settings-bottom-bar')
    ).toBeInTheDocument();

    mockUseDeveloperMode.mockReturnValue({
      isDeveloperMode: false,
      isSaving: false,
      setDeveloperMode,
    });
    rerender(
      <I18nProvider>
        <SettingsTab />
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
        <SettingsTab />
      </I18nProvider>
    );

    expect(screen.getByTestId('streams-settings-tuning-editor')).toHaveValue(savedYaml);
    expect(
      screen.queryByTestId('streams-significant-events-settings-bottom-bar')
    ).not.toBeInTheDocument();
  });

  it('preserves a dirty YAML draft when developer-mode disable rolls back after a failed save', () => {
    const { rerender } = setup({ isDeveloperMode: true });

    fireEvent.change(screen.getByTestId('streams-settings-tuning-editor'), {
      target: { value: 'sample_size: 99' },
    });

    // Simulate optimistic update: isDeveloperMode goes false while save is in flight
    mockUseDeveloperMode.mockReturnValue({
      isDeveloperMode: false,
      isSaving: true,
      setDeveloperMode,
    });
    rerender(
      <I18nProvider>
        <SettingsTab />
      </I18nProvider>
    );

    // Simulate rollback: save failed, isDeveloperMode reverts to true
    mockUseDeveloperMode.mockReturnValue({
      isDeveloperMode: true,
      isSaving: false,
      setDeveloperMode,
    });
    rerender(
      <I18nProvider>
        <SettingsTab />
      </I18nProvider>
    );

    expect(screen.getByTestId('streams-settings-tuning-editor')).toHaveValue('sample_size: 99');
  });

  it('hides the tuning panel and disables save while developer mode is saving', () => {
    const { rerender } = setup({ isDeveloperMode: true });

    fireEvent.change(screen.getByTestId('streams-settings-index-patterns'), {
      target: { value: 'metrics-*' },
    });
    expect(screen.getByTestId('streams-settings-save-button')).toBeEnabled();

    mockUseDeveloperMode.mockReturnValue({
      isDeveloperMode: true,
      isSaving: true,
      setDeveloperMode,
    });
    rerender(
      <I18nProvider>
        <SettingsTab />
      </I18nProvider>
    );

    expect(screen.queryByTestId('nightshiftSettingsTuningPanel')).not.toBeInTheDocument();
    expect(screen.getByTestId('streams-settings-save-button')).toBeDisabled();
  });

  it('disables the developer mode switch while settings are saving', async () => {
    setup({ isDeveloperMode: true });

    let resolveSet: () => void = () => undefined;
    settingsClientSet.mockReturnValue(
      new Promise<boolean>((resolve) => {
        resolveSet = () => resolve(true);
      })
    );

    fireEvent.change(screen.getByTestId('streams-settings-index-patterns'), {
      target: { value: 'metrics-*' },
    });
    fireEvent.click(screen.getByTestId('streams-settings-save-button'));
    fireEvent.click(screen.getByRole('button', { name: 'Save anyway' }));

    await waitFor(() => {
      expect(screen.getByTestId('nightshiftDeveloperModeSwitch')).toBeDisabled();
    });

    resolveSet();
    await waitFor(() => {
      expect(screen.getByTestId('nightshiftDeveloperModeSwitch')).toBeEnabled();
    });
  });
});
