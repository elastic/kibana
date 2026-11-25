/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { elasticAlertsAdapter } from './adapters/elastic';
import {
  HARD_CAP_MS,
  MAX_CONSECUTIVE_FAILURES,
  POLL_INTERVAL_MS,
  pollAlertOutcomes,
  type PollAlertOutcomesDeps,
} from './poll';
import type { AlertOutcomeTrackingStore, StoredTrackingRecord } from './tracking_store';
import type { CheckResult, TrackingRecord } from './types';

jest.mock('./adapters/elastic', () => ({
  ...jest.requireActual('./adapters/elastic'),
  elasticAlertsAdapter: { source: 'elastic', resolve: jest.fn(), check: jest.fn() },
}));

const check = elasticAlertsAdapter.check as jest.Mock;
const NOW = Date.parse('2026-11-24T12:00:00.000Z');
const iso = (ms: number) => new Date(ms).toISOString();

/** Keeps records in memory with the store's sequence-number semantics. */
class FakeTrackingStore {
  readonly docs = new Map<string, StoredTrackingRecord>();
  private seq = 0;

  put(record: TrackingRecord) {
    this.docs.set(record.investigation_id, { record, seqNo: this.seq++, primaryTerm: 1 });
  }

  record(id: string) {
    return this.docs.get(id)!.record;
  }

  async findDue({ spaceId, now }: { spaceId: string; now: string }) {
    return [...this.docs.values()]
      .filter(
        ({ record }) =>
          record.space_id === spaceId && record.state === 'tracking' && record.next_check_at! <= now
      )
      .sort((a, b) => a.record.next_check_at!.localeCompare(b.record.next_check_at!));
  }

  async update(stored: StoredTrackingRecord, patch: Partial<TrackingRecord>) {
    const current = this.docs.get(stored.record.investigation_id);
    if (!current || current.seqNo !== stored.seqNo) return undefined;
    const next = { record: { ...current.record, ...patch }, seqNo: this.seq++, primaryTerm: 1 };
    this.docs.set(stored.record.investigation_id, next);
    return next;
  }
}

const tracking = (overrides: Partial<TrackingRecord> = {}): TrackingRecord => ({
  investigation_id: 'inv-1',
  space_id: 'default',
  automation_id: 'auto-1',
  subject_type: 'slack_thread',
  post_received_at: iso(NOW - 60 * 60_000),
  created_at: iso(NOW - 55 * 60_000),
  updated_at: iso(NOW - 10 * 60_000),
  state: 'tracking',
  source: 'elastic',
  connector_id: 'remote-es',
  ref: { source: 'elastic', connector_id: 'remote-es', alert_uuid: 'alert-1' },
  last_firing_at: iso(NOW - 5 * 60_000),
  next_check_at: iso(NOW - 1000),
  consecutive_failures: 0,
  ...overrides,
});

const setup = ({
  enabled = true,
  statuses = { 'inv-1': 'open' as const },
  results = { 'alert-1': { status: 'firing' } as CheckResult },
}: {
  enabled?: boolean;
  statuses?: Record<string, 'open' | 'closed'>;
  results?: Record<string, CheckResult>;
} = {}) => {
  const store = new FakeTrackingStore();
  check.mockReset().mockResolvedValue(new Map(Object.entries(results)));
  const telemetry = { reportAlertOutcome: jest.fn(), reportAlertOutcomeChecks: jest.fn() };
  const deps = {
    trackingStore: store as unknown as AlertOutcomeTrackingStore,
    isEnabled: () => enabled,
    adapterContext: { actionsClient: {} },
    getInvestigationStatuses: jest.fn(async () => new Map(Object.entries(statuses))),
    telemetry,
    logger: loggingSystemMock.createLogger(),
    now: () => NOW,
  } as unknown as PollAlertOutcomesDeps & { telemetry: typeof telemetry };
  const poll = (deadline = NOW + 60_000) =>
    pollAlertOutcomes(deps, { spaceId: 'default', deadline });
  return { store, deps, telemetry, poll };
};

describe('pollAlertOutcomes', () => {
  it('does nothing when alert outcome tracking is turned off', async () => {
    const { store, poll } = setup({ enabled: false });
    store.put(tracking());
    await expect(poll()).resolves.toMatchObject({ skipped: 'disabled', checked: 0 });
    expect(check).not.toHaveBeenCalled();
  });

  it('reschedules a firing alert and records when it was last seen firing', async () => {
    const { store, poll, telemetry } = setup();
    store.put(tracking({ consecutive_failures: 2 }));
    await expect(poll()).resolves.toMatchObject({ checked: 1, recovered: 0 });
    expect(store.record('inv-1')).toMatchObject({
      state: 'tracking',
      last_status: 'firing',
      last_firing_at: iso(NOW),
      next_check_at: iso(NOW + POLL_INTERVAL_MS),
      consecutive_failures: 0,
    });
    expect(telemetry.reportAlertOutcomeChecks).toHaveBeenCalledWith({
      source: 'elastic',
      checked: 1,
      firing: 1,
      recovered: 0,
      stale: 0,
      unknown: 0,
      errors: 0,
    });
  });

  it('skips records that are not due', async () => {
    const { store, poll } = setup();
    store.put(tracking({ next_check_at: iso(NOW + 1000) }));
    await expect(poll()).resolves.toMatchObject({ checked: 0 });
    expect(check).not.toHaveBeenCalled();
  });

  it('records a recovery once, with how long it took to see it', async () => {
    const { store, poll, telemetry } = setup({
      results: { 'alert-1': { status: 'recovered', recovered_at: iso(NOW - 3 * 60_000) } },
    });
    store.put(tracking());
    await expect(poll()).resolves.toMatchObject({ checked: 1, recovered: 1 });
    expect(store.record('inv-1')).toMatchObject({
      state: 'recovered',
      last_status: 'recovered',
      recovered_seen_at: iso(NOW),
    });
    expect(telemetry.reportAlertOutcome).toHaveBeenCalledWith({
      transition: 'recovered',
      source: 'elastic',
      automation_id: 'auto-1',
      detection_lag_seconds: 180,
      tracked_seconds: 3600,
    });

    // A later run finds nothing to do.
    await expect(poll()).resolves.toMatchObject({ checked: 0, recovered: 0 });
  });

  it('records nothing when another run wrote the record first', async () => {
    const { store, poll, telemetry } = setup({
      results: { 'alert-1': { status: 'recovered' } },
    });
    store.put(tracking());
    check.mockImplementation(async () => {
      // Another sweep writes the record between this run's read and its update.
      const current = store.docs.get('inv-1')!;
      await store.update(current, { state: 'recovered', recovered_seen_at: iso(NOW - 1000) });
      return new Map([['alert-1', { status: 'recovered' }]]);
    });
    await expect(poll()).resolves.toMatchObject({ recovered: 0 });
    expect(store.record('inv-1').recovered_seen_at).toBe(iso(NOW - 1000));
    expect(telemetry.reportAlertOutcome).not.toHaveBeenCalled();
  });

  it.each([
    ['closed', { statuses: { 'inv-1': 'closed' as const } }, 'investigation_closed'],
    ['missing', { statuses: {} }, 'investigation_closed'],
  ])('stops tracking when the investigation is %s', async (_, options, reason) => {
    const { store, poll } = setup(options);
    store.put(tracking());
    await expect(poll()).resolves.toMatchObject({ stopped: 1, checked: 0 });
    expect(store.record('inv-1')).toMatchObject({ state: 'stopped', stop_reason: reason });
    expect(check).not.toHaveBeenCalled();
  });

  it('stops tracking after the hard cap', async () => {
    const { store, poll, telemetry } = setup();
    store.put(tracking({ post_received_at: iso(NOW - HARD_CAP_MS - 1000) }));
    await poll();
    expect(store.record('inv-1')).toMatchObject({ state: 'stopped', stop_reason: 'expired' });
    expect(telemetry.reportAlertOutcome).toHaveBeenCalledWith(
      expect.objectContaining({ transition: 'stopped', reason: 'expired' })
    );
  });

  it.each([
    ['stale', { status: 'stale' } as CheckResult, 'stale'],
    [
      'untracked',
      { status: 'unknown', stop: 'untracked_by_source' } as CheckResult,
      'untracked_by_source',
    ],
  ])('stops tracking a %s alert', async (_, result, reason) => {
    const { store, poll } = setup({ results: { 'alert-1': result } });
    store.put(tracking());
    await poll();
    expect(store.record('inv-1')).toMatchObject({ state: 'stopped', stop_reason: reason });
  });

  it('keeps checking an alert it could not find', async () => {
    const { store, poll } = setup({ results: {} });
    store.put(tracking());
    await poll();
    expect(store.record('inv-1')).toMatchObject({
      state: 'tracking',
      last_status: 'unknown',
      next_check_at: iso(NOW + POLL_INTERVAL_MS),
    });
  });

  it('counts consecutive errors and stops at the limit', async () => {
    const { store, poll } = setup({
      results: { 'alert-1': { status: 'error', message: 'access denied' } },
    });
    store.put(tracking({ consecutive_failures: MAX_CONSECUTIVE_FAILURES - 2 }));
    await expect(poll()).resolves.toMatchObject({ errors: 1 });
    expect(store.record('inv-1')).toMatchObject({
      state: 'tracking',
      consecutive_failures: MAX_CONSECUTIVE_FAILURES - 1,
    });

    store.put({ ...store.record('inv-1'), next_check_at: iso(NOW - 1) });
    await poll();
    expect(store.record('inv-1')).toMatchObject({ state: 'stopped', stop_reason: 'access_lost' });
  });

  it('stops at the deadline and leaves the rest for the next run', async () => {
    const { store, deps } = setup();
    store.put(tracking());
    let clock = NOW;
    deps.now = () => clock;
    check.mockImplementation(async () => {
      clock = NOW + 61_000;
      return new Map([['alert-1', { status: 'firing' }]]);
    });
    await expect(
      pollAlertOutcomes(deps, { spaceId: 'default', deadline: NOW + 60_000 })
    ).resolves.toMatchObject({ timed_out: true, checked: 0 });
    expect(store.record('inv-1').next_check_at).toBe(tracking().next_check_at);
  });

  it('only reads records of its space', async () => {
    const { store, poll } = setup();
    store.put(tracking({ space_id: 'other' }));
    await expect(poll()).resolves.toMatchObject({ checked: 0 });
  });

  it('never throws', async () => {
    const { store, poll, deps } = setup();
    store.put(tracking());
    (deps.getInvestigationStatuses as jest.Mock).mockRejectedValue(new Error('boom'));
    await expect(poll()).resolves.toMatchObject({ errors: 1 });
  });
});
