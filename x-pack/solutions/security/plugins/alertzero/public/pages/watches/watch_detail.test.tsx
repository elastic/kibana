/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route } from '@kbn/shared-ux-router';
import {
  SYSTEM_SECURITY_WATCH_HUNT_ID,
  SYSTEM_SECURITY_WATCH_DETECTION_ID,
  SYSTEM_SECURITY_WATCH_FLOOR_ID,
  SYSTEM_SECURITY_WATCH_FORENSICS_ID,
  SYSTEM_SECURITY_WATCH_OFFICER_ID,
  SYSTEM_SECURITY_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_ID,
  SYSTEM_SECURITY_WORKER_DETECTION_RULE_CREATION_ID,
  SYSTEM_SECURITY_WORKER_DETECTION_RULE_TUNING_ID,
  SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID,
  SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID,
  SYSTEM_SECURITY_WORKER_FORENSICS_ENDPOINT_ANALYSIS_ID,
  createCatalogWatchPlaceholder,
  type CatalogWatchId,
  type Worker,
} from '@kbn/alertzero-common';
import { WatchDetailPage } from './watch_detail';
import * as settingsI18n from './settings_translations';
import { useWatch } from '../../hooks/use_watches_api';
import { useUpdateWorker, useWorkers } from '../../hooks/use_workers_api';

jest.mock('../../hooks/use_alertzero_doc_title', () => ({ useAlertZeroDocTitle: jest.fn() }));
jest.mock('../../hooks/use_watches_api');
jest.mock('../../hooks/use_workers_api');
jest.mock('./components/watches_section_layout', () => ({
  WatchesSectionLayout: ({ children, title }: { children: React.ReactNode; title: string }) => (
    <div>
      <h1>{title}</h1>
      {children}
    </div>
  ),
}));

const mockUseWatch = jest.mocked(useWatch);
const mockUseWorkers = jest.mocked(useWorkers);
const mockUseUpdateWorker = jest.mocked(useUpdateWorker);

const createWorker = (
  overrides: Partial<Worker> & Pick<Worker, 'id' | 'name' | 'watchIds'>
): Worker => ({
  enabled: false,
  lastRun: null,
  state: 'paused',
  settingsRevision: null,
  settings: {
    workerId: overrides.id,
    autonomy: 'manual',
  },
  ...overrides,
});

const floorWorkers: Worker[] = [
  createWorker({
    id: SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID,
    name: 'Alert Triage',
    watchIds: [SYSTEM_SECURITY_WATCH_FLOOR_ID],
  }),
  createWorker({
    id: SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID,
    name: 'Attack Discovery',
    watchIds: [SYSTEM_SECURITY_WATCH_FLOOR_ID],
    // The only schedule-driven Worker, so the only one whose settings carry an interval.
    settings: {
      workerId: SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID,
      autonomy: 'manual',
      scheduleInterval: '24h',
    },
  }),
];

const forensicsWorker = createWorker({
  id: SYSTEM_SECURITY_WORKER_FORENSICS_ENDPOINT_ANALYSIS_ID,
  name: 'Endpoint Forensic Analysis',
  watchIds: [SYSTEM_SECURITY_WATCH_FORENSICS_ID],
});

const huntWorker = createWorker({
  id: SYSTEM_SECURITY_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_ID,
  name: 'Continuous Threat Hunt',
  watchIds: [SYSTEM_SECURITY_WATCH_HUNT_ID],
});

const detectionWorkers: Worker[] = [
  createWorker({
    id: SYSTEM_SECURITY_WORKER_DETECTION_RULE_TUNING_ID,
    name: 'Rule Tuning',
    watchIds: [SYSTEM_SECURITY_WATCH_DETECTION_ID],
    settings: {
      workerId: SYSTEM_SECURITY_WORKER_DETECTION_RULE_TUNING_ID,
      autonomy: 'manual',
      scheduleInterval: '2h',
      extras: { analysisWindowDays: 14 },
    },
  }),
  createWorker({
    id: SYSTEM_SECURITY_WORKER_DETECTION_RULE_CREATION_ID,
    name: 'Rule Creation',
    watchIds: [SYSTEM_SECURITY_WATCH_DETECTION_ID],
  }),
];

const renderWatch = (watchId: string, workers: Worker[]) => {
  mockUseWatch.mockReturnValue({
    data: { watch: createCatalogWatchPlaceholder(watchId as CatalogWatchId) },
    isLoading: false,
    error: null,
    refetch: jest.fn(),
  } as never);
  mockUseWorkers.mockReturnValue({
    data: { workers },
    isLoading: false,
    error: null,
    refetch: jest.fn(),
  } as never);
  const mutate = jest.fn();
  const mutateAsync = jest.fn().mockResolvedValue({ worker: workers[0] });
  mockUseUpdateWorker.mockReturnValue({ mutate, mutateAsync } as never);

  render(
    <MemoryRouter initialEntries={[`/watches/${watchId}`]}>
      <Route path="/watches/:watchId">
        <WatchDetailPage />
      </Route>
    </MemoryRouter>
  );

  return { mutate, mutateAsync };
};

describe('WatchDetailPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows Floor Workers with per-Worker enablement and autonomy, and no Watch switch', () => {
    renderWatch(SYSTEM_SECURITY_WATCH_FLOOR_ID, [...floorWorkers, huntWorker, forensicsWorker]);

    expect(screen.queryByTestId('alertZeroWatchEnabledSwitch')).not.toBeInTheDocument();
    expect(screen.getByTestId('alertZeroWatchWorkersSection')).toBeInTheDocument();
    expect(
      screen.getByTestId(
        `alertZeroWatchWorkerSection-${SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID}`
      )
    ).toBeInTheDocument();
    expect(
      screen.getByTestId(
        `alertZeroWatchWorkerSection-${SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID}`
      )
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId(
        `alertZeroWatchWorkerSection-${SYSTEM_SECURITY_WORKER_FORENSICS_ENDPOINT_ANALYSIS_ID}`
      )
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId(
        `alertZeroWatchWorkerSection-${SYSTEM_SECURITY_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_ID}`
      )
    ).not.toBeInTheDocument();

    for (const worker of floorWorkers) {
      const section = screen.getByTestId(`alertZeroWatchWorkerSection-${worker.id}`);
      expect(
        within(section).getByTestId(`alertZeroWorkerEnabledSwitch-${worker.id}`)
      ).toBeInTheDocument();
      expect(within(section).getByTestId('alertZeroAutonomySlider')).toBeInTheDocument();
    }

    expect(screen.queryByTestId('alertZeroCandidateLimit')).not.toBeInTheDocument();
  });

  it('shows the schedule control only for the Worker that owns a schedule', () => {
    renderWatch(SYSTEM_SECURITY_WATCH_FLOOR_ID, floorWorkers);

    const attackDiscovery = screen.getByTestId(
      `alertZeroWatchWorkerSection-${SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID}`
    );
    const alertTriage = screen.getByTestId(
      `alertZeroWatchWorkerSection-${SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID}`
    );

    expect(within(attackDiscovery).getByTestId('alertZeroScheduleIntervalValue')).toHaveValue(24);
    expect(within(attackDiscovery).getByTestId('alertZeroScheduleIntervalUnit')).toHaveValue('h');
    expect(
      within(alertTriage).queryByTestId('alertZeroScheduleIntervalField')
    ).not.toBeInTheDocument();
  });

  it('shows Hunt Watch with one Worker that has enablement and autonomy', () => {
    renderWatch(SYSTEM_SECURITY_WATCH_HUNT_ID, [huntWorker, ...floorWorkers]);

    const section = screen.getByTestId(
      `alertZeroWatchWorkerSection-${SYSTEM_SECURITY_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_ID}`
    );
    expect(section).toBeInTheDocument();
    expect(
      screen.queryByTestId(
        `alertZeroWatchWorkerSection-${SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID}`
      )
    ).not.toBeInTheDocument();
    expect(
      within(section).getByTestId(
        `alertZeroWorkerEnabledSwitch-${SYSTEM_SECURITY_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_ID}`
      )
    ).toBeInTheDocument();
    expect(within(section).getByTestId('alertZeroAutonomySlider')).toBeInTheDocument();
    expect(screen.queryByTestId('alertZeroCandidateLimit')).not.toBeInTheDocument();
  });

  it('shows a Worker-load error instead of an empty member list', () => {
    mockUseWatch.mockReturnValue({
      data: { watch: createCatalogWatchPlaceholder(SYSTEM_SECURITY_WATCH_FLOOR_ID) },
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    } as never);
    mockUseWorkers.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('workers unavailable'),
      refetch: jest.fn(),
    } as never);
    mockUseUpdateWorker.mockReturnValue({ mutate: jest.fn(), mutateAsync: jest.fn() } as never);

    render(
      <MemoryRouter initialEntries={[`/watches/${SYSTEM_SECURITY_WATCH_FLOOR_ID}`]}>
        <Route path="/watches/:watchId">
          <WatchDetailPage />
        </Route>
      </MemoryRouter>
    );

    expect(screen.getByTestId('alertZeroWatchWorkersLoadError')).toBeInTheDocument();
    expect(
      screen.queryByTestId(
        `alertZeroWatchWorkerSection-${SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID}`
      )
    ).not.toBeInTheDocument();
  });

  it('shows Officer as an empty grouping without a load error', () => {
    renderWatch(SYSTEM_SECURITY_WATCH_OFFICER_ID, [
      ...floorWorkers,
      huntWorker,
      ...detectionWorkers,
      forensicsWorker,
    ]);

    expect(screen.getByTestId('alertZeroWatchWorkersSection')).toBeInTheDocument();
    expect(screen.queryByTestId('alertZeroWatchWorkersLoadError')).not.toBeInTheDocument();
    expect(screen.queryByTestId(/alertZeroWatchWorkerSection-/)).not.toBeInTheDocument();
  });

  it('shows Detection Workers with per-Worker enablement and autonomy', () => {
    renderWatch(SYSTEM_SECURITY_WATCH_DETECTION_ID, [
      ...floorWorkers,
      huntWorker,
      ...detectionWorkers,
      forensicsWorker,
    ]);

    for (const worker of detectionWorkers) {
      const section = screen.getByTestId(`alertZeroWatchWorkerSection-${worker.id}`);
      expect(section).toBeInTheDocument();
      expect(
        within(section).getByTestId(`alertZeroWorkerEnabledSwitch-${worker.id}`)
      ).toBeInTheDocument();
      expect(within(section).getByTestId('alertZeroAutonomySlider')).toBeInTheDocument();
    }
    expect(
      screen.queryByTestId(
        `alertZeroWatchWorkerSection-${SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID}`
      )
    ).not.toBeInTheDocument();
  });

  it('shows Forensics Watch with one Worker that has enablement and autonomy', () => {
    renderWatch(SYSTEM_SECURITY_WATCH_FORENSICS_ID, [
      ...floorWorkers,
      darkWorker,
      ...detectionWorkers,
      forensicsWorker,
    ]);

    const section = screen.getByTestId(
      `alertZeroWatchWorkerSection-${SYSTEM_SECURITY_WORKER_FORENSICS_ENDPOINT_ANALYSIS_ID}`
    );
    expect(section).toBeInTheDocument();
    expect(
      screen.queryByTestId(
        `alertZeroWatchWorkerSection-${SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID}`
      )
    ).not.toBeInTheDocument();
    expect(
      within(section).getByTestId(
        `alertZeroWorkerEnabledSwitch-${SYSTEM_SECURITY_WORKER_FORENSICS_ENDPOINT_ANALYSIS_ID}`
      )
    ).toBeInTheDocument();
    expect(within(section).getByTestId('alertZeroAutonomySlider')).toBeInTheDocument();
    expect(within(section).queryByTestId('alertZeroScheduleIntervalField')).not.toBeInTheDocument();
  });

  it('shows the analysis window only on Rule Tuning and does not write while editing', () => {
    const { mutate, mutateAsync } = renderWatch(
      SYSTEM_SECURITY_WATCH_DETECTION_ID,
      detectionWorkers
    );
    const ruleTuning = screen.getByTestId(
      `alertZeroWatchWorkerSection-${SYSTEM_SECURITY_WORKER_DETECTION_RULE_TUNING_ID}`
    );
    const ruleCreation = screen.getByTestId(
      `alertZeroWatchWorkerSection-${SYSTEM_SECURITY_WORKER_DETECTION_RULE_CREATION_ID}`
    );

    expect(within(ruleTuning).getByTestId('alertZeroAnalysisWindowDays')).toHaveValue(14);
    expect(
      within(ruleCreation).queryByTestId('alertZeroAnalysisWindowDays')
    ).not.toBeInTheDocument();
    expect(screen.getByTestId('alertZeroWatchSettingsSave')).toBeDisabled();
    expect(screen.getByTestId('alertZeroWatchSettingsDiscard')).toBeDisabled();

    fireEvent.click(
      screen.getByTestId(
        `alertZeroWorkerEnabledSwitch-${SYSTEM_SECURITY_WORKER_DETECTION_RULE_TUNING_ID}`
      )
    );

    expect(mutate).not.toHaveBeenCalled();
    expect(mutateAsync).not.toHaveBeenCalled();
    expect(screen.getByTestId('alertZeroWatchSettingsSave')).toBeEnabled();
    expect(screen.queryByTestId(/alertZeroWorkerRun-/)).not.toBeInTheDocument();
  });

  it('locks every control while a save is in flight and unlocks them when it completes', async () => {
    const { mutateAsync } = renderWatch(SYSTEM_SECURITY_WATCH_DETECTION_ID, detectionWorkers);
    let resolveSave: ((value: { worker: Worker }) => void) | undefined;
    mutateAsync.mockImplementation(
      () =>
        new Promise<{ worker: Worker }>((resolve) => {
          resolveSave = resolve;
        })
    );
    const ruleTuning = screen.getByTestId(
      `alertZeroWatchWorkerSection-${SYSTEM_SECURITY_WORKER_DETECTION_RULE_TUNING_ID}`
    );
    const editableControls = () => [
      screen.getByTestId(
        `alertZeroWorkerEnabledSwitch-${SYSTEM_SECURITY_WORKER_DETECTION_RULE_TUNING_ID}`
      ),
      screen.getByTestId(
        `alertZeroWorkerEnabledSwitch-${SYSTEM_SECURITY_WORKER_DETECTION_RULE_CREATION_ID}`
      ),
      within(ruleTuning).getByTestId('alertZeroAutonomySlider'),
      within(ruleTuning).getByTestId('alertZeroScheduleIntervalValue'),
      within(ruleTuning).getByTestId('alertZeroScheduleIntervalUnit'),
      within(ruleTuning).getByTestId('alertZeroAnalysisWindowDays'),
    ];
    const save = screen.getByTestId('alertZeroWatchSettingsSave');
    const discard = screen.getByTestId('alertZeroWatchSettingsDiscard');

    fireEvent.click(editableControls()[0]);
    fireEvent.click(save);
    await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1));

    for (const control of editableControls()) {
      expect(control).toBeDisabled();
    }
    expect(save).toBeDisabled();
    expect(discard).toBeDisabled();

    await act(async () => {
      resolveSave!({ worker: { ...detectionWorkers[0], enabled: true } });
    });

    for (const control of editableControls()) {
      expect(control).toBeEnabled();
    }
    // Clean again, so Save and Discard stay disabled for the usual reason, not because of saving.
    expect(save).toBeDisabled();
    expect(discard).toBeDisabled();
    expect(screen.queryByText(settingsI18n.WORKER_SETTINGS_UNAVAILABLE)).not.toBeInTheDocument();
  });

  it('blocks Save while the Worker reload has failed and allows the retry with the original revision', async () => {
    const installed = detectionWorkers.map((worker) => ({ ...worker, settingsRevision: 1 }));
    const workersQuery = (error: Error | null) =>
      ({ data: { workers: installed }, isLoading: false, error, refetch: jest.fn() } as never);
    mockUseWatch.mockReturnValue({
      data: { watch: createCatalogWatchPlaceholder(SYSTEM_SECURITY_WATCH_DETECTION_ID) },
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    } as never);
    mockUseWorkers.mockReturnValue(workersQuery(null));
    const mutateAsync = jest.fn().mockResolvedValue({ worker: installed[0] });
    mockUseUpdateWorker.mockReturnValue({ mutate: jest.fn(), mutateAsync } as never);
    // A fresh element each time, or React bails out of re-rendering an identical element.
    const tree = () => (
      <MemoryRouter initialEntries={[`/watches/${SYSTEM_SECURITY_WATCH_DETECTION_ID}`]}>
        <Route path="/watches/:watchId">
          <WatchDetailPage />
        </Route>
      </MemoryRouter>
    );
    const { rerender } = render(tree());

    const field = screen.getByTestId('alertZeroAnalysisWindowDays');
    fireEvent.change(field, { target: { value: '7' } });
    fireEvent.blur(field);
    expect(screen.getByTestId('alertZeroWatchSettingsSave')).toBeEnabled();

    // The recovery read after a failed PATCH did not succeed: stale Workers stay cached.
    mockUseWorkers.mockReturnValue(workersQuery(new Error('reload failed')));
    rerender(tree());

    expect(screen.getByTestId('alertZeroWatchWorkersLoadError')).toBeInTheDocument();
    expect(screen.getByTestId('alertZeroWatchSettingsSave')).toBeDisabled();
    expect(screen.getByTestId('alertZeroWatchSettingsDiscard')).toBeEnabled();
    fireEvent.click(screen.getByTestId('alertZeroWatchSettingsSave'));
    expect(mutateAsync).not.toHaveBeenCalled();

    // Retry succeeded: the draft and its original revision are still there to retry with.
    mockUseWorkers.mockReturnValue(workersQuery(null));
    rerender(tree());

    expect(screen.getByTestId('alertZeroWatchSettingsSave')).toBeEnabled();
    fireEvent.click(screen.getByTestId('alertZeroWatchSettingsSave'));
    await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1));
    expect(mutateAsync).toHaveBeenCalledWith({
      workerId: SYSTEM_SECURITY_WORKER_DETECTION_RULE_TUNING_ID,
      patch: { settings: { extras: { analysisWindowDays: 7 } }, settingsRevision: 1 },
    });
  });

  it('enables Save while the analysis window is being typed and saves the latest value', async () => {
    const { mutateAsync } = renderWatch(SYSTEM_SECURITY_WATCH_DETECTION_ID, detectionWorkers);
    const field = screen.getByTestId('alertZeroAnalysisWindowDays');
    const save = screen.getByTestId('alertZeroWatchSettingsSave');

    fireEvent.change(field, { target: { value: '2' } });
    expect(save).toBeEnabled();
    fireEvent.change(field, { target: { value: '21' } });
    expect(save).toBeEnabled();
    expect(mutateAsync).not.toHaveBeenCalled();

    fireEvent.click(save);

    await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1));
    expect(mutateAsync).toHaveBeenCalledWith({
      workerId: SYSTEM_SECURITY_WORKER_DETECTION_RULE_TUNING_ID,
      patch: { settings: { extras: { analysisWindowDays: 21 } }, settingsRevision: null },
    });
  });

  it('enables Save while the interval is being typed and saves the latest value', async () => {
    const { mutateAsync } = renderWatch(SYSTEM_SECURITY_WATCH_FLOOR_ID, floorWorkers);
    const attackDiscovery = screen.getByTestId(
      `alertZeroWatchWorkerSection-${SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID}`
    );
    const value = within(attackDiscovery).getByTestId('alertZeroScheduleIntervalValue');
    const save = screen.getByTestId('alertZeroWatchSettingsSave');

    fireEvent.change(value, { target: { value: '1' } });
    expect(save).toBeEnabled();
    fireEvent.change(value, { target: { value: '12' } });
    expect(mutateAsync).not.toHaveBeenCalled();

    fireEvent.click(save);

    await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1));
    expect(mutateAsync).toHaveBeenCalledWith({
      workerId: SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID,
      patch: { settings: { scheduleInterval: '12h' }, settingsRevision: null },
    });
  });

  it('resets typed numeric values on Discard without writing', () => {
    const { mutateAsync } = renderWatch(SYSTEM_SECURITY_WATCH_DETECTION_ID, detectionWorkers);
    const ruleTuning = screen.getByTestId(
      `alertZeroWatchWorkerSection-${SYSTEM_SECURITY_WORKER_DETECTION_RULE_TUNING_ID}`
    );
    const window = within(ruleTuning).getByTestId('alertZeroAnalysisWindowDays');
    const interval = within(ruleTuning).getByTestId('alertZeroScheduleIntervalValue');

    fireEvent.change(window, { target: { value: '7' } });
    fireEvent.change(interval, { target: { value: '6' } });
    expect(screen.getByTestId('alertZeroWatchSettingsDiscard')).toBeEnabled();

    fireEvent.click(screen.getByTestId('alertZeroWatchSettingsDiscard'));

    expect(window).toHaveValue(14);
    expect(interval).toHaveValue(2);
    expect(screen.getByTestId('alertZeroWatchSettingsSave')).toBeDisabled();
    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it('sends the whole extras object under settings when the analysis window is saved', async () => {
    const { mutateAsync } = renderWatch(SYSTEM_SECURITY_WATCH_DETECTION_ID, detectionWorkers);
    const field = screen.getByTestId('alertZeroAnalysisWindowDays');

    fireEvent.change(field, { target: { value: '7' } });
    fireEvent.blur(field);
    fireEvent.click(screen.getByTestId('alertZeroWatchSettingsSave'));

    await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1));
    // Uninstalled Worker: the draft's revision is null and is sent as such.
    expect(mutateAsync).toHaveBeenCalledWith({
      workerId: SYSTEM_SECURITY_WORKER_DETECTION_RULE_TUNING_ID,
      patch: { settings: { extras: { analysisWindowDays: 7 } }, settingsRevision: null },
    });
  });
});
