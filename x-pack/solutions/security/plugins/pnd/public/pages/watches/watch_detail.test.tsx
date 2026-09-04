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
  SYSTEM_SECURITY_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_ID,
  SYSTEM_SECURITY_WORKER_DETECTION_RULE_CREATION_ID,
  SYSTEM_SECURITY_WORKER_DETECTION_RULE_TUNING_ID,
  SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID,
  SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID,
  createCatalogWatchPlaceholder,
  type CatalogWatchId,
  type Worker,
} from '@kbn/pnd-common';
import { WatchDetailPage } from './watch_detail';
import { useWatch } from '../../hooks/use_watches_api';
import { useUpdateWorker, useWorkers } from '../../hooks/use_workers_api';

jest.mock('../../hooks/use_pnd_doc_title', () => ({ usePndDocTitle: jest.fn() }));
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
  }),
];

const darkWorker = createWorker({
  id: SYSTEM_SECURITY_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_ID,
  name: 'Continuous Threat Hunt',
  watchIds: [SYSTEM_SECURITY_WATCH_DARK_ID],
});

const detectionWorkers: Worker[] = [
  createWorker({
    id: SYSTEM_SECURITY_WORKER_DETECTION_RULE_TUNING_ID,
    name: 'Rule Tuning',
    watchIds: [SYSTEM_SECURITY_WATCH_DETECTION_ID],
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
  mockUseUpdateWorker.mockReturnValue({ mutate } as never);

  render(
    <MemoryRouter initialEntries={[`/watches/${watchId}`]}>
      <Route path="/watches/:watchId">
        <WatchDetailPage />
      </Route>
    </MemoryRouter>
  );

  return { mutate };
};

describe('WatchDetailPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows Floor Workers with per-Worker enablement and autonomy, and no Watch switch', () => {
    renderWatch(SYSTEM_SECURITY_WATCH_FLOOR_ID, [...floorWorkers, darkWorker]);

    expect(screen.queryByTestId('pndWatchEnabledSwitch')).not.toBeInTheDocument();
    expect(screen.getByTestId('pndWatchWorkersSection')).toBeInTheDocument();
    expect(
      screen.getByTestId(`pndWatchWorkerSection-${SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID}`)
    ).toBeInTheDocument();
    expect(
      screen.getByTestId(
        `pndWatchWorkerSection-${SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID}`
      )
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId(
        `pndWatchWorkerSection-${SYSTEM_SECURITY_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_ID}`
      )
    ).not.toBeInTheDocument();

    for (const worker of floorWorkers) {
      const section = screen.getByTestId(`pndWatchWorkerSection-${worker.id}`);
      expect(
        within(section).getByTestId(`pndWorkerEnabledSwitch-${worker.id}`)
      ).toBeInTheDocument();
      expect(within(section).getByTestId('pndAutonomySlider')).toBeInTheDocument();
    }

    expect(screen.queryByTestId('pndCandidateLimit')).not.toBeInTheDocument();
  });

  it('shows Hunt Watch with one Worker that has enablement and autonomy', () => {
    renderWatch(SYSTEM_SECURITY_WATCH_DARK_ID, [darkWorker, ...floorWorkers]);

    const section = screen.getByTestId(
      `pndWatchWorkerSection-${SYSTEM_SECURITY_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_ID}`
    );
    expect(section).toBeInTheDocument();
    expect(
      screen.queryByTestId(`pndWatchWorkerSection-${SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID}`)
    ).not.toBeInTheDocument();
    expect(
      within(section).getByTestId(
        `pndWorkerEnabledSwitch-${SYSTEM_SECURITY_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_ID}`
      )
    ).toBeInTheDocument();
    expect(within(section).getByTestId('pndAutonomySlider')).toBeInTheDocument();
    expect(screen.queryByTestId('pndCandidateLimit')).not.toBeInTheDocument();
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
    mockUseUpdateWorker.mockReturnValue({ mutate: jest.fn() } as never);

    render(
      <MemoryRouter initialEntries={[`/watches/${SYSTEM_SECURITY_WATCH_FLOOR_ID}`]}>
        <Route path="/watches/:watchId">
          <WatchDetailPage />
        </Route>
      </MemoryRouter>
    );

    expect(screen.getByTestId('pndWatchWorkersLoadError')).toBeInTheDocument();
    expect(
      screen.queryByTestId(`pndWatchWorkerSection-${SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID}`)
    ).not.toBeInTheDocument();
  });

  it('shows Officer as an empty grouping without a load error', () => {
    renderWatch(SYSTEM_SECURITY_WATCH_OFFICER_ID, [
      ...floorWorkers,
      darkWorker,
      ...detectionWorkers,
    ]);

    expect(screen.getByTestId('pndWatchWorkersSection')).toBeInTheDocument();
    expect(screen.queryByTestId('pndWatchWorkersLoadError')).not.toBeInTheDocument();
    expect(screen.queryByTestId(/pndWatchWorkerSection-/)).not.toBeInTheDocument();
  });

  it('shows Detection Workers with per-Worker enablement and autonomy', () => {
    renderWatch(SYSTEM_SECURITY_WATCH_DETECTION_ID, [
      ...floorWorkers,
      darkWorker,
      ...detectionWorkers,
    ]);

    for (const worker of detectionWorkers) {
      const section = screen.getByTestId(`pndWatchWorkerSection-${worker.id}`);
      expect(section).toBeInTheDocument();
      expect(
        within(section).getByTestId(`pndWorkerEnabledSwitch-${worker.id}`)
      ).toBeInTheDocument();
      expect(within(section).getByTestId('pndAutonomySlider')).toBeInTheDocument();
    }
    expect(
      screen.queryByTestId(`pndWatchWorkerSection-${SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID}`)
    ).not.toBeInTheDocument();
  });
});
