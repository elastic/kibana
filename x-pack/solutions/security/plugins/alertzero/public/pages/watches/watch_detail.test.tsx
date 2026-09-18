/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { readFileSync } from 'fs';
import { join } from 'path';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route } from '@kbn/shared-ux-router';
import {
  SYSTEM_SECURITY_WATCH_HUNT_ID,
  SYSTEM_SECURITY_WATCH_DETECTION_ID,
  SYSTEM_SECURITY_WATCH_FLOOR_ID,
  SYSTEM_SECURITY_WATCH_OFFICER_ID,
  SYSTEM_SECURITY_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_ID,
  SYSTEM_SECURITY_WORKER_DETECTION_RULE_CREATION_ID,
  SYSTEM_SECURITY_WORKER_DETECTION_RULE_TUNING_ID,
  SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID,
  SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID,
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
  WatchesSectionLayout: ({
    children,
    title,
    headerPrimaryActionItem,
    headerItems,
  }: {
    children: React.ReactNode;
    title: string;
    headerPrimaryActionItem?: {
      label: string;
      testId?: string;
      disableButton?: boolean | (() => boolean);
      isLoading?: boolean;
      run: () => void;
    };
    headerItems?: Array<{
      label: string;
      testId?: string;
      disableButton?: boolean | (() => boolean);
      run: () => void;
    }>;
  }) => {
    const resolveDisabled = (disableButton?: boolean | (() => boolean)) =>
      typeof disableButton === 'function' ? disableButton() : Boolean(disableButton);
    return (
      <div>
        <h1>{title}</h1>
        {headerItems?.map((item) => (
          <button
            key={item.testId}
            type="button"
            data-test-subj={item.testId}
            disabled={resolveDisabled(item.disableButton)}
            onClick={() => item.run()}
          >
            {item.label}
          </button>
        ))}
        {headerPrimaryActionItem ? (
          <button
            type="button"
            data-test-subj={headerPrimaryActionItem.testId}
            disabled={resolveDisabled(headerPrimaryActionItem.disableButton)}
            onClick={() => headerPrimaryActionItem.run()}
          >
            {headerPrimaryActionItem.label}
          </button>
        ) : null}
        {children}
      </div>
    );
  },
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
    renderWatch(SYSTEM_SECURITY_WATCH_FLOOR_ID, [...floorWorkers, huntWorker]);

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
        `alertZeroWatchWorkerSection-${SYSTEM_SECURITY_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_ID}`
      )
    ).not.toBeInTheDocument();

    for (const worker of floorWorkers) {
      const section = screen.getByTestId(`alertZeroWatchWorkerSection-${worker.id}`);
      expect(
        within(section).getByTestId(`alertZeroWorkerEnabledSwitch-${worker.id}`)
      ).toBeInTheDocument();
      expect(within(section).getByTestId('alertZeroAutonomyLevelControl')).toBeInTheDocument();
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

    expect(
      within(attackDiscovery).getByTestId(
        `alertZeroTriggerAmount-${SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID}`
      )
    ).toHaveValue(24);
    expect(
      within(attackDiscovery).getByTestId(
        `alertZeroTriggerUnit-${SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID}`
      )
    ).toHaveValue('h');
    expect(
      within(alertTriage).queryByTestId(
        `alertZeroTriggerRow-${SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID}`
      )
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
    expect(within(section).getByTestId('alertZeroAutonomyLevelControl')).toBeInTheDocument();
    expect(screen.queryByTestId('alertZeroCandidateLimit')).not.toBeInTheDocument();
  });

  it('renders Worker settings in accordions for multi-Worker Watches and a static panel for a single-Worker Watch', () => {
    renderWatch(SYSTEM_SECURITY_WATCH_FLOOR_ID, floorWorkers);

    for (const worker of floorWorkers) {
      expect(screen.getByTestId(`alertZeroWatchWorkerAccordion-${worker.id}`)).toBeInTheDocument();
    }

    // A Watch with exactly one Worker has no accordion chrome — its settings are a static panel.
    renderWatch(SYSTEM_SECURITY_WATCH_HUNT_ID, [huntWorker]);
    expect(
      screen.queryByTestId(
        `alertZeroWatchWorkerAccordion-${SYSTEM_SECURITY_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_ID}`
      )
    ).not.toBeInTheDocument();
    expect(
      screen.getByTestId(
        `alertZeroWatchWorkerSection-${SYSTEM_SECURITY_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_ID}`
      )
    ).toBeInTheDocument();
  });

  it('lays the accordion out with its own nodes and keeps the enable switch out of the toggle button', () => {
    renderWatch(SYSTEM_SECURITY_WATCH_FLOOR_ID, floorWorkers);

    for (const worker of floorWorkers) {
      const header = screen.getByTestId(`alertZeroWorkerAccordionHeader-${worker.id}`);
      const body = screen.getByTestId(`alertZeroWorkerSettingsBody-${worker.id}`);
      expect(header).toBeInTheDocument();
      expect(body).toBeInTheDocument();
      // The band and the body carry the padding: EUI's own accordion nodes stay untouched.
      expect(getComputedStyle(header).padding).toBe('16px');
      expect(getComputedStyle(body).padding).toBe('16px');

      // The switch is interactive content; EUI renders it beside the toggle, never inside it.
      expect(
        screen.getByTestId(`alertZeroWorkerEnabledSwitch-${worker.id}`).closest('button')
      ).toBeNull();
    }
  });

  it('styles its accordion through EuiAccordion props, not through EUI private classes', () => {
    // `.euiAccordion__*` is EUI internals rather than a public contract, so an EUI update may
    // reshape it — the panel has to carry its own nodes and style them instead.
    const panelSource = readFileSync(
      join(__dirname, 'components/worker_settings_panel.tsx'),
      'utf8'
    );
    expect(panelSource).not.toMatch(/\.euiAccordion__/);
  });

  it('renders each member as a section in a single column — no summary rail', () => {
    renderWatch(SYSTEM_SECURITY_WATCH_FLOOR_ID, floorWorkers);

    const [first, second] = floorWorkers;
    expect(screen.queryByTestId('alertZeroWatchWorkersRail')).not.toBeInTheDocument();

    const firstSection = screen.getByTestId(`alertZeroWatchWorkerSection-${first.id}`);
    const secondSection = screen.getByTestId(`alertZeroWatchWorkerSection-${second.id}`);
    expect(firstSection).toBeInTheDocument();
    expect(secondSection).toBeInTheDocument();
    // Document order: first Worker's section precedes the second's in the single column.
    const allSections = screen.getAllByTestId(/^alertZeroWatchWorkerSection-/);
    expect(allSections.indexOf(firstSection)).toBeLessThan(allSections.indexOf(secondSection));
  });

  it('offers only the autonomy levels a Worker allows', () => {
    renderWatch(SYSTEM_SECURITY_WATCH_FLOOR_ID, floorWorkers);

    // Attack Discovery has no assisted gate; Alert Triage carries the full dial.
    const attackDiscovery = screen.getByTestId(
      `alertZeroWatchWorkerSection-${SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID}`
    );
    expect(within(attackDiscovery).getByTestId('alertZeroAutonomyCard-manual')).toBeInTheDocument();
    expect(
      within(attackDiscovery).getByTestId('alertZeroAutonomyCard-supervised')
    ).toBeInTheDocument();
    expect(
      within(attackDiscovery).queryByTestId('alertZeroAutonomyCard-assisted')
    ).not.toBeInTheDocument();

    const alertTriage = screen.getByTestId(
      `alertZeroWatchWorkerSection-${SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID}`
    );
    for (const level of ['manual', 'assisted', 'supervised'] as const) {
      expect(within(alertTriage).getByTestId(`alertZeroAutonomyCard-${level}`)).toBeInTheDocument();
    }
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
    ]);

    for (const worker of detectionWorkers) {
      const section = screen.getByTestId(`alertZeroWatchWorkerSection-${worker.id}`);
      expect(section).toBeInTheDocument();
      expect(
        within(section).getByTestId(`alertZeroWorkerEnabledSwitch-${worker.id}`)
      ).toBeInTheDocument();
      expect(within(section).getByTestId('alertZeroAutonomyLevelControl')).toBeInTheDocument();
    }
    expect(
      screen.queryByTestId(
        `alertZeroWatchWorkerSection-${SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID}`
      )
    ).not.toBeInTheDocument();
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
      // EuiCheckableCard puts the test subject on its wrapper; the disabled state is on the input.
      within(within(ruleTuning).getByTestId('alertZeroAutonomyCard-manual')).getByRole('radio'),
      within(ruleTuning).getByTestId(
        `alertZeroTriggerAmount-${SYSTEM_SECURITY_WORKER_DETECTION_RULE_TUNING_ID}`
      ),
      within(ruleTuning).getByTestId(
        `alertZeroTriggerUnit-${SYSTEM_SECURITY_WORKER_DETECTION_RULE_TUNING_ID}`
      ),
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
    const value = within(attackDiscovery).getByTestId(
      `alertZeroTriggerAmount-${SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID}`
    );
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
    const interval = within(ruleTuning).getByTestId(
      `alertZeroTriggerAmount-${SYSTEM_SECURITY_WORKER_DETECTION_RULE_TUNING_ID}`
    );

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
