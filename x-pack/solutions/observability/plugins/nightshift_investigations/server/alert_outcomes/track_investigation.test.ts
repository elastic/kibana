/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { ELASTICSEARCH_CONNECTOR_TYPE_ID, elasticAlertsAdapter } from './adapters/elastic';
import {
  slackTsToIso,
  trackInvestigationAlertOutcome,
  type TrackInvestigationDeps,
} from './track_investigation';
import type { AlertOutcomeTrackingStore } from './tracking_store';

jest.mock('./adapters/elastic', () => ({
  ...jest.requireActual('./adapters/elastic'),
  elasticAlertsAdapter: { source: 'elastic', resolve: jest.fn(), check: jest.fn() },
}));

const resolve = elasticAlertsAdapter.resolve as jest.Mock;
const NOW = new Date('2026-11-24T10:05:00.000Z');
const REF = {
  source: 'elastic' as const,
  connector_id: 'remote-es',
  alert_uuid: 'alert-1',
  rule_id: 'rule-1',
};

const modelOutput = (overrides: Record<string, unknown> = {}) => ({
  source: 'elastic',
  connector_id: 'remote-es',
  alert_id: 'alert-1',
  rule_id: '',
  instance_key: '',
  evidence: [{ kind: 'post_link', value: 'https://prod.kb.example.com/app/r?alertId=alert-1' }],
  ...overrides,
});

const setup = ({
  enabled = true,
  existing = false,
  subjects = [
    {
      subjectType: 'slack_thread',
      slack: { thread_ts: '1795600000.000100', permalink: 'https://slack/p1' },
    },
  ],
  output = modelOutput(),
}: {
  enabled?: boolean;
  existing?: boolean;
  subjects?: Array<{ subjectType: string; slack?: { thread_ts?: string; permalink?: string } }>;
  output?: unknown;
} = {}) => {
  resolve.mockReset().mockResolvedValue({ ref: REF });
  const trackingStore = {
    get: jest.fn().mockResolvedValue(existing ? { record: {} } : undefined),
    create: jest.fn().mockResolvedValue(true),
  };
  const inferenceClient = { output: jest.fn().mockResolvedValue({ output }) };
  const telemetry = { reportAlertOutcome: jest.fn() };
  const deps = {
    trackingStore: trackingStore as unknown as AlertOutcomeTrackingStore,
    isEnabled: () => enabled,
    listSubjects: jest.fn().mockResolvedValue(subjects),
    getFirstRound: jest.fn().mockResolvedValue({
      message: 'Slack message from Kibana in channel C1:\n\n🔥 High error rate is active',
      startedAt: '2026-11-24T10:00:30.000Z',
      steps: [],
    }),
    actionsClient: {
      get: jest.fn(),
      execute: jest.fn(),
      getAll: jest.fn().mockResolvedValue([
        {
          id: 'remote-es',
          name: 'Prod cluster',
          actionTypeId: ELASTICSEARCH_CONNECTOR_TYPE_ID,
          config: { url: 'https://prod.es.example.com', selectedActions: ['search'] },
        },
        { id: 'slack', name: 'Slack', actionTypeId: '.slack_api', config: { url: 'secret' } },
      ]),
    },
    getInferenceClient: jest.fn().mockResolvedValue(inferenceClient),
    telemetry,
    logger: loggingSystemMock.createLogger(),
    now: () => NOW,
  } as unknown as TrackInvestigationDeps;
  const track = (params: Partial<Parameters<typeof trackInvestigationAlertOutcome>[1]> = {}) =>
    trackInvestigationAlertOutcome(deps, {
      spaceId: 'default',
      investigationId: 'inv-1',
      automationId: 'auto-1',
      isFollowUp: false,
      investigationStartedAt: '2026-11-24T10:00:20.000Z',
      ...params,
    });
  return { deps, trackingStore, inferenceClient, telemetry, track };
};

describe('trackInvestigationAlertOutcome', () => {
  it('records an alert the adapter verified, due for its first check now', async () => {
    const { track, trackingStore, inferenceClient, telemetry } = setup();
    await expect(track()).resolves.toEqual({ state: 'tracking', source: 'elastic' });

    expect(resolve).toHaveBeenCalledWith(
      expect.objectContaining({ source: 'elastic', alert_id: 'alert-1', rule_id: null }),
      { postReceivedAt: slackTsToIso('1795600000.000100') },
      expect.anything()
    );
    expect(trackingStore.create).toHaveBeenCalledWith({
      investigation_id: 'inv-1',
      space_id: 'default',
      automation_id: 'auto-1',
      subject_type: 'slack_thread',
      post_received_at: slackTsToIso('1795600000.000100'),
      created_at: NOW.toISOString(),
      updated_at: NOW.toISOString(),
      state: 'tracking',
      source: 'elastic',
      connector_id: 'remote-es',
      proposal: expect.objectContaining({ alert_id: 'alert-1' }),
      ref: REF,
      next_check_at: NOW.toISOString(),
      consecutive_failures: 0,
    });
    expect(telemetry.reportAlertOutcome).toHaveBeenCalledWith({
      transition: 'tracked',
      source: 'elastic',
      automation_id: 'auto-1',
    });

    const { input } = inferenceClient.output.mock.calls[0][0];
    expect(input).toContain('High error rate is active');
    expect(input).toContain('https://slack/p1');
    expect(input).toContain(
      'id=remote-es type=.elasticsearch name="Prod cluster" url=https://prod.es.example.com'
    );
    expect(input).not.toContain('secret');
  });

  it('records why an alert is untrackable', async () => {
    const { track, trackingStore, telemetry } = setup();
    resolve.mockResolvedValue({ untrackable: 'not_found', detail: 'no alert' });
    await expect(track()).resolves.toEqual({
      state: 'untrackable',
      source: 'elastic',
      reason: 'not_found',
    });
    expect(trackingStore.create).toHaveBeenCalledWith(
      expect.objectContaining({
        state: 'untrackable',
        untrackable_reason: 'not_found',
        untrackable_detail: 'no alert',
      })
    );
    expect(trackingStore.create.mock.calls[0][0]).not.toHaveProperty('next_check_at');
    expect(telemetry.reportAlertOutcome).toHaveBeenCalledWith(
      expect.objectContaining({ transition: 'untrackable', reason: 'not_found' })
    );
  });

  it.each([
    ['a provider without an adapter', modelOutput({ source: 'pagerduty' }), 'unsupported_source'],
    ['an unknown source', modelOutput({ source: 'unknown' }), 'insufficient_identity'],
  ])('does not verify %s', async (_, output, reason) => {
    const { track } = setup({ output });
    await expect(track()).resolves.toMatchObject({ state: 'untrackable', reason });
    expect(resolve).not.toHaveBeenCalled();
  });

  it.each([
    ['a follow-up', { isFollowUp: true }, {}, 'follow_up'],
    ['alert outcome tracking turned off', {}, { enabled: false }, 'disabled'],
    ['an investigation already tracked', {}, { existing: true }, 'already_tracked'],
    [
      'an investigation of an alert on this cluster',
      {},
      { subjects: [{ subjectType: 'alert' }] },
      'local_alert_subject',
    ],
  ])('skips %s without calling the model', async (_, params, options, skipReason) => {
    const { track, inferenceClient, trackingStore } = setup(options);
    await expect(track(params)).resolves.toEqual({ skip_reason: skipReason });
    expect(inferenceClient.output).not.toHaveBeenCalled();
    expect(trackingStore.create).not.toHaveBeenCalled();
  });

  it('skips when the model is unavailable or the round is missing', async () => {
    const missingModel = setup();
    (missingModel.deps.getInferenceClient as jest.Mock).mockResolvedValue(undefined);
    await expect(missingModel.track()).resolves.toEqual({ skip_reason: 'model_unavailable' });

    const missingRound = setup();
    (missingRound.deps.getFirstRound as jest.Mock).mockResolvedValue(undefined);
    await expect(missingRound.track()).resolves.toEqual({ skip_reason: 'no_round' });
  });

  it('falls back to the round start without a Slack thread', async () => {
    const { track, trackingStore } = setup({ subjects: [{ subjectType: 'manual' }] });
    await track();
    expect(trackingStore.create).toHaveBeenCalledWith(
      expect.objectContaining({
        post_received_at: '2026-11-24T10:00:30.000Z',
        subject_type: 'manual',
      })
    );
  });

  it('reports a failed extraction and never throws', async () => {
    const { track, telemetry, trackingStore } = setup({ output: { source: 'not-a-source' } });
    await expect(track()).resolves.toEqual({ skip_reason: 'failed' });
    expect(telemetry.reportAlertOutcome).toHaveBeenCalledWith({
      transition: 'extract_failed',
      automation_id: 'auto-1',
    });
    expect(trackingStore.create).not.toHaveBeenCalled();
  });

  it('treats a concurrent write as already tracked', async () => {
    const { track, trackingStore, telemetry } = setup();
    trackingStore.create.mockResolvedValue(false);
    await expect(track()).resolves.toEqual({ skip_reason: 'already_tracked' });
    expect(telemetry.reportAlertOutcome).not.toHaveBeenCalled();
  });
});

describe('slackTsToIso', () => {
  it('reads Slack message timestamps', () => {
    expect(slackTsToIso('1795600000.000100')).toBe('2026-11-25T09:46:40.000Z');
    expect(slackTsToIso('')).toBeUndefined();
    expect(slackTsToIso('abc')).toBeUndefined();
  });
});
