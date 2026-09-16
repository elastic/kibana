/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route } from '@kbn/shared-ux-router';
import {
  SYSTEM_SECURITY_WATCH_DARK_ID,
  SYSTEM_SECURITY_WATCH_DETECTION_ID,
  SYSTEM_SECURITY_WATCH_FLOOR_ID,
  SYSTEM_SECURITY_WATCH_OFFICER_ID,
  SYSTEM_SECURITY_WORKER_DARK_CONTINUOUS_THREAT_HUNT_ID,
  SYSTEM_SECURITY_WORKER_DETECTION_RULE_CREATION_ID,
  SYSTEM_SECURITY_WORKER_DETECTION_RULE_TUNING_ID,
  SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID,
  SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID,
  createCatalogWatchPlaceholder,
  type CatalogWatchId,
  type Worker,
} from '@kbn/alertzero-common';
import { WatchDetailPage } from './watch_detail';
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

// jsdom ships neither IntersectionObserver nor scrollIntoView; the two-column layout's scroll-spy
// and rail navigation depend on both.
class IntersectionObserverMock {
  observe = jest.fn();
  unobserve = jest.fn();
  disconnect = jest.fn();
  takeRecords = jest.fn(() => []);
  root = null;
  rootMargin = '';
  thresholds: number[] = [];
}

global.IntersectionObserver = IntersectionObserverMock as unknown as typeof IntersectionObserver;

const createWorker = (
  overrides: Partial<Worker> & Pick<Worker, 'id' | 'name' | 'watchIds'>
): Worker => ({
  enabled: false,
  lastRun: null,
  state: 'paused',
  settingsRevision: null,
  allowedAutonomyLevels: ['manual', 'assisted', 'supervised'],
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
    settings: {
      workerId: SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID,
      autonomy: 'manual',
    },
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

const darkWorker = createWorker({
  id: SYSTEM_SECURITY_WORKER_DARK_CONTINUOUS_THREAT_HUNT_ID,
  name: 'Continuous Threat Hunt',
  watchIds: [SYSTEM_SECURITY_WATCH_DARK_ID],
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
    window.HTMLElement.prototype.scrollIntoView = jest.fn();
  });

  it('shows Floor Workers with per-Worker enablement and autonomy, and the summary rail for multi-Worker Watches', () => {
    renderWatch(SYSTEM_SECURITY_WATCH_FLOOR_ID, [...floorWorkers, darkWorker]);

    expect(screen.getByTestId('alertZeroWatchWorkersRail')).toBeInTheDocument();
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
        `alertZeroWatchWorkerSection-${SYSTEM_SECURITY_WORKER_DARK_CONTINUOUS_THREAT_HUNT_ID}`
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
    ).toHaveTextContent(/hours/i);
    expect(
      within(alertTriage).queryByTestId(
        `alertZeroTriggerAmount-${SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID}`
      )
    ).not.toBeInTheDocument();
  });

  it('renders no detectionConfig controls for any Worker (decisions item 9)', () => {
    // detectionConfig was removed rather than wired: the triage workflow it claimed to drive is a
    // stub, so the UI carried settings no run consumed. Asserting ABSENCE keeps it from creeping back.
    renderWatch(SYSTEM_SECURITY_WATCH_FLOOR_ID, floorWorkers);

    const alertTriage = screen.getByTestId(
      `alertZeroWatchWorkerSection-${SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID}`
    );
    const attackDiscovery = screen.getByTestId(
      `alertZeroWatchWorkerSection-${SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID}`
    );

    for (const [section, workerId] of [
      [alertTriage, SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID],
      [attackDiscovery, SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID],
    ] as const) {
      expect(
        within(section).queryByTestId(`alertZeroAutoCloseRow-${workerId}`)
      ).not.toBeInTheDocument();
      expect(
        within(section).queryByTestId(`alertZeroMinConfidence-${workerId}`)
      ).not.toBeInTheDocument();
    }
  });

  it('shows Dark Watch with one Worker that has enablement and autonomy', () => {
    renderWatch(SYSTEM_SECURITY_WATCH_DARK_ID, [darkWorker, ...floorWorkers]);

    const section = screen.getByTestId(
      `alertZeroWatchWorkerSection-${SYSTEM_SECURITY_WORKER_DARK_CONTINUOUS_THREAT_HUNT_ID}`
    );
    expect(section).toBeInTheDocument();
    expect(
      screen.queryByTestId(
        `alertZeroWatchWorkerSection-${SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID}`
      )
    ).not.toBeInTheDocument();
    expect(
      within(section).getByTestId(
        `alertZeroWorkerEnabledSwitch-${SYSTEM_SECURITY_WORKER_DARK_CONTINUOUS_THREAT_HUNT_ID}`
      )
    ).toBeInTheDocument();
    expect(within(section).getByTestId('alertZeroAutonomyLevelControl')).toBeInTheDocument();
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
      darkWorker,
      ...detectionWorkers,
    ]);

    expect(screen.getByTestId('alertZeroWatchWorkersEmpty')).toBeInTheDocument();
    expect(screen.queryByTestId('alertZeroWatchWorkersLoadError')).not.toBeInTheDocument();
    expect(screen.queryByTestId(/alertZeroWatchWorkerSection-/)).not.toBeInTheDocument();
    expect(screen.queryByTestId('alertZeroWatchWorkersRail')).not.toBeInTheDocument();
  });

  it('shows Detection Workers with per-Worker enablement and autonomy', () => {
    renderWatch(SYSTEM_SECURITY_WATCH_DETECTION_ID, [
      ...floorWorkers,
      darkWorker,
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

  it('renders Worker settings in accordions for multi-Worker Watches and a static panel for a single-Worker Watch', () => {
    renderWatch(SYSTEM_SECURITY_WATCH_FLOOR_ID, floorWorkers);

    for (const worker of floorWorkers) {
      expect(screen.getByTestId(`alertZeroWatchWorkerAccordion-${worker.id}`)).toBeInTheDocument();
    }
    expect(
      screen.getByTestId(
        `alertZeroWatchWorkerAccordion-${SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID}`
      )
    ).toBeInTheDocument();

    // A Watch with exactly one Worker has no accordion chrome — its settings are a static panel.
    renderWatch(SYSTEM_SECURITY_WATCH_DARK_ID, [darkWorker]);
    expect(
      screen.queryByTestId(
        `alertZeroWatchWorkerAccordion-${SYSTEM_SECURITY_WORKER_DARK_CONTINUOUS_THREAT_HUNT_ID}`
      )
    ).not.toBeInTheDocument();
    expect(
      screen.getByTestId(
        `alertZeroWatchWorkerSection-${SYSTEM_SECURITY_WORKER_DARK_CONTINUOUS_THREAT_HUNT_ID}`
      )
    ).toBeInTheDocument();
  });

  it('renders a summary rail card per member and marks the first as active', () => {
    renderWatch(SYSTEM_SECURITY_WATCH_FLOOR_ID, floorWorkers);

    const [first, second] = floorWorkers;
    expect(screen.getByTestId(`alertZeroWatchWorkerSummary-${first.id}`)).toHaveAttribute(
      'aria-current',
      'true'
    );
    expect(screen.getByTestId(`alertZeroWatchWorkerSummary-${second.id}`)).not.toHaveAttribute(
      'aria-current'
    );
  });

  it('renders the analysis window control only on Rule Tuning', () => {
    renderWatch(SYSTEM_SECURITY_WATCH_DETECTION_ID, detectionWorkers);
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
  });
});
