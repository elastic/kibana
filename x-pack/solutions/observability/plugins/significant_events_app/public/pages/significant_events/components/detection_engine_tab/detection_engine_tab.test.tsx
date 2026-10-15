/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import type {
  EngineEvent,
  EngineEventDetailsResponse,
  EngineOverviewResponse,
} from '@kbn/significant-events-plugin/common';
import { DetectionEngineTab } from '.';

const mockActions = {
  pendingAction: undefined,
  runEngine: jest.fn(),
  replay: jest.fn(),
  updateConfig: jest.fn(),
  setupLab: jest.fn(),
  startIncident: jest.fn(),
  stopIncident: jest.fn(),
  resetLab: jest.fn(),
  createCustomerRule: jest.fn(),
  dismissEvent: jest.fn(),
  closeEvent: jest.fn(),
  verifyEvent: jest.fn(),
};

const mockEvent: EngineEvent = {
  event_id: 'event-1',
  space_id: 'default',
  title: 'payments error ratio is 33%',
  summary: 'Payments returns gateway timeouts; checkout fails with it.',
  severity: 'high',
  status: 'active',
  services: ['payments', 'checkout'],
  members: [
    {
      fingerprint: 'health:error_ratio:lab:payments',
      strategy: 'health_checks',
      service: 'payments',
      title: 'payments error ratio is 33%',
      latest_detection_id: 'detection-1',
      value: 0.33,
      peak_value: 0.58,
      threshold: 0.03,
      unit: 'ratio',
      importance: 83,
      evidence_esql: 'FROM logs | LIMIT 20',
      healthy: false,
      healthy_streak: 0,
      first_seen: '2026-10-15T06:55:00.000Z',
      last_seen: '2026-10-15T06:55:00.000Z',
      joined_at: '2026-10-15T06:55:00.000Z',
      join_reason: 'first detection',
      verdict: 'confirms',
      evidence_result: 'found',
    },
    {
      fingerprint: 'health:error_ratio:lab:checkout',
      strategy: 'health_checks',
      service: 'checkout',
      title: 'checkout error ratio is 25%',
      latest_detection_id: 'detection-2',
      value: 0.25,
      peak_value: 0.25,
      threshold: 0.03,
      unit: 'ratio',
      importance: 75,
      evidence_esql: 'FROM logs | LIMIT 20',
      healthy: false,
      healthy_streak: 0,
      first_seen: '2026-10-15T06:55:00.000Z',
      last_seen: '2026-10-15T06:55:00.000Z',
      joined_at: '2026-10-15T06:55:00.000Z',
      join_reason: 'checkout calls payments, which is in this event',
      verdict: 'confirms',
      evidence_result: 'found',
    },
  ],
  origin_strategy: 'health_checks',
  episode: 1,
  created_at: '2026-10-15T06:56:00.000Z',
  opened_at: '2026-10-15T06:55:00.000Z',
  updated_at: '2026-10-15T06:56:00.000Z',
  open_windows: [{ from: '2026-10-15T06:55:00.000Z' }],
  assessment: {
    agent: 'heuristic',
    at: '2026-10-15T06:56:00.000Z',
    explanation: 'Confirmed: checkout calls payments, which is in this event, 0 min apart.',
    verdicts: [],
    proposed_severity: 'critical',
    severity_guard:
      'Critical needs two confirming pieces of evidence or a firing customer alert; capped at high.',
  },
};

const mockScorecard = {
  detections: 0,
  above_normal: 0,
  would_raise_in_trial: 0,
  events_opened: 0,
  events_dismissed: 0,
  verifier_failures: 0,
};

const mockOverview: EngineOverviewResponse = {
  config: {
    strategies: {
      ki_rules: { mode: 'live', daily_cap: 10 },
      health_checks: { mode: 'live', daily_cap: 10 },
      customer_alerts: { mode: 'live', daily_cap: 20 },
      new_log_patterns: { mode: 'trial', daily_cap: 5 },
    },
    agent: { kind: 'heuristic' },
    baseline: { min_samples: 10, history_buckets: 60, mad_k: 3 },
    bucket_minutes: 1,
    join_window_minutes: 60,
    quiet_period_buckets: 2,
    worse_margin: 0.25,
    max_agent_calls_per_run: 8,
    publish_to_alerting_v2: true,
  },
  strategies: [
    {
      id: 'health_checks',
      name: 'Health checks',
      watches: 'Every service',
      reportsWhen: 'Error ratio at or above 5%',
      baselinePolicy: 'own_history',
      reportsOnlyFiring: false,
      supportsReplay: true,
      config: { mode: 'live', daily_cap: 10 },
      scorecard: { strategy: 'health_checks', ...mockScorecard, events_opened: 1 },
      opened_today: 1,
    },
    {
      id: 'new_log_patterns',
      name: 'New log patterns',
      watches: 'Log message patterns',
      reportsWhen: 'A pattern appears',
      baselinePolicy: 'implicit_zero',
      reportsOnlyFiring: true,
      supportsReplay: true,
      config: { mode: 'trial', daily_cap: 5 },
      scorecard: { strategy: 'new_log_patterns', ...mockScorecard, would_raise_in_trial: 2 },
      opened_today: 0,
    },
  ],
  proposals: [
    {
      id: 'new_log_patterns:promote',
      strategy: 'new_log_patterns',
      change: { mode: 'live' },
      title: 'Turn on with its daily cap',
      evidence: 'In trial it would have raised 2 detection(s) past the baseline check.',
    },
  ],
  last_run: {
    run_id: 'run-1',
    started_at: '2026-10-15T06:56:24.000Z',
    finished_at: '2026-10-15T06:56:31.000Z',
    bucket_start: '2026-10-15T06:55:00.000Z',
    bucket_end: '2026-10-15T06:56:00.000Z',
    strategies: [
      {
        strategy: 'health_checks',
        mode: 'live',
        observations: 12,
        looked_off: 2,
        duration_ms: 40,
      },
    ],
    detections: 3,
    baseline: { above_normal: 2, background: 0, warming_up: 1, skipped: 0 },
    outcomes: { new_event: 1, joined: 1, warming_up: 1 },
    agent: { calls: 2, cooldown_skips: 0, rejected_answers: 0, failures: 0, tokens: 0 },
    transitions: [{ event_id: 'event-1', from: 'none', to: 'active' }],
    open_events: 1,
  },
  last_evaluated_bucket_end: '2026-10-15T06:56:00.000Z',
  counts: { open_events: 1, events: 1, detections_last_hour: 3 },
  cost: {
    ledger: {
      since: '2026-10-15T06:00:00.000Z',
      total_usd: 0.1047465,
      calls: 4,
      prompt_tokens: 14_457,
      cached_tokens: 0,
      completion_tokens: 1_890,
      unpriced_tokens: 0,
      by_day: { '2026-10-15': { usd: 0.1047465, tokens: 16_347, calls: 4 } },
      by_model: { 'anthropic-claude-4.6-sonnet': { usd: 0.1047465, tokens: 16_347, calls: 4 } },
    },
    today_usd: 0.1047465,
    current_price: {
      model: 'anthropic-claude-4.6-sonnet',
      input: 4.5,
      output: 21,
      cache_read: 0.45,
    },
    prices_available: true,
  },
  lab: {
    ready: true,
    index: 'logs-detectionlab-default',
    services: ['payments', 'checkout'],
    dependencies: [{ source: 'checkout', target: 'payments' }],
    incidents: [
      {
        id: 'incident-1',
        kind: 'error_spike',
        service: 'payments',
        started_at: '2026-10-15T06:39:42.000Z',
      },
    ],
  },
};

const mockDetails: EngineEventDetailsResponse = {
  event: mockEvent,
  detections: [],
  activity: [
    {
      '@timestamp': '2026-10-15T06:56:31.000Z',
      space_id: 'default',
      step: 'join',
      action: 'confirmed',
      message: 'Code proposed joining; the agent confirmed.',
      event_id: 'event-1',
    },
  ],
};

jest.mock('../../../../hooks/use_detection_engine_actions', () => ({
  useDetectionEngineActions: () => mockActions,
}));
jest.mock('../../../../hooks/use_detection_engine_auto_run', () => ({
  useDetectionEngineAutoRun: jest.fn(),
}));
jest.mock('../../../../hooks/use_detection_engine_overview', () => ({
  useDetectionEngineOverview: () => ({ data: mockOverview, isLoading: false }),
}));
jest.mock('../../../../hooks/use_detection_engine_events', () => ({
  useDetectionEngineEvents: () => ({ data: { events: [mockEvent] }, isLoading: false }),
}));
jest.mock('../../../../hooks/use_detection_engine_services', () => ({
  useDetectionEngineServices: () => ({
    data: {
      services: [
        {
          service: 'payments',
          watched_by: [{ strategy: 'health_checks', series: 3 }],
          detections_last_hour: 4,
          open_events: 1,
        },
      ],
    },
  }),
}));
jest.mock('../../../../hooks/use_detection_engine_event', () => ({
  useDetectionEngineEvent: () => ({ data: mockDetails, isLoading: false }),
}));
jest.mock('../../../../hooks/use_genai_connectors', () => ({
  useGenAIConnectors: () => ({
    connectors: [{ connectorId: 'claude', name: 'Claude' }],
    loading: false,
  }),
}));
jest.mock('../../../../hooks/use_kibana', () => ({
  useKibana: () => ({
    dependencies: {
      start: {
        share: {
          url: { locators: { get: () => ({ getRedirectUrl: () => '/app/discover#/evidence' }) } },
        },
      },
    },
  }),
}));

function renderTab() {
  return render(
    <I18nProvider>
      <DetectionEngineTab />
    </I18nProvider>
  );
}

describe('DetectionEngineTab', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows the last run as a pipeline from strategies to events', () => {
    renderTab();

    expect(screen.getByTestId('detectionEngineStageBaseline').textContent).toContain(
      'Above normal: 2'
    );
    expect(screen.getByTestId('detectionEngineStageDiscovery').textContent).toContain(
      'Joined event: 1'
    );
    expect(screen.getByTestId('detectionEngineStageAgent').textContent).toContain(
      'Verdicts, severity, explanation2Skipped by cooldown: 0'
    );
  });

  it('shows the accumulated model cost at list price', () => {
    renderTab();

    expect(screen.getByTestId('detectionEngineKpi-cost').textContent).toContain('$0.1047');
    expect(screen.getByTestId('detectionEngineKpi-cost').textContent).toContain(
      '16.3K tokens · anthropic-claude-4.6-sonnet'
    );
  });

  it('colours a service with an open event on the system map', () => {
    renderTab();

    expect(screen.getByTestId('detectionEngineMapNode-payments').textContent).toContain(
      'payments error ratio is 33%'
    );
    expect(screen.getByTestId('detectionEngineMapNode-checkout').textContent).toContain(
      'payments error ratio is 33%'
    );
  });

  it('starts a demo scenario in one click', () => {
    renderTab();

    fireEvent.click(screen.getByTestId('detectionEngineScenario-slow_frontend'));

    expect(mockActions.startIncident).toHaveBeenCalledWith({
      kind: 'latency',
      service: 'frontend',
    });
  });

  it('starts a lab incident for the chosen service', () => {
    renderTab();

    fireEvent.click(screen.getByTestId('detectionEngineLabIncident-checkout-latency'));

    expect(mockActions.startIncident).toHaveBeenCalledWith({
      kind: 'latency',
      service: 'checkout',
    });
  });

  it('disables an incident that is already running', () => {
    renderTab();

    expect(
      (screen.getByTestId('detectionEngineScenario-payments_outage') as HTMLButtonElement).disabled
    ).toBe(true);
  });

  it('opens the event view with its reasoning, signals and timeline', () => {
    renderTab();

    fireEvent.click(screen.getByTestId('detectionEngineEventLink-event-1'));

    const flyout = screen.getByTestId('detectionEngineEventFlyout');
    expect(within(flyout).getByTestId('detectionEngineEventSummary').textContent).toBe(
      'Payments returns gateway timeouts; checkout fails with it.'
    );
    expect(within(flyout).getByText('checkout error ratio is 25%')).toBeTruthy();
    expect(
      within(flyout).getByText(
        'Agent proposed critical. Critical needs two confirming pieces of evidence or a firing customer alert; capped at high.'
      )
    ).toBeTruthy();
    expect(within(flyout).getByTestId('detectionEngineEventTimeline').textContent).toContain(
      'Code proposed joining; the agent confirmed.'
    );
  });

  it('runs the engine on demand', () => {
    renderTab();

    fireEvent.click(screen.getByTestId('detectionEngineRunButton'));

    expect(mockActions.runEngine).toHaveBeenCalledTimes(1);
  });

  it('applies a learning-loop proposal only when a person accepts it', () => {
    renderTab();
    fireEvent.click(screen.getByTestId('detectionEngineInnerTab-strategies'));

    expect(mockActions.updateConfig).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId('detectionEngineAcceptProposal-new_log_patterns:promote'));

    expect(mockActions.updateConfig).toHaveBeenCalledWith({
      strategies: {
        ...mockOverview.config.strategies,
        new_log_patterns: { mode: 'live', daily_cap: 5 },
      },
    });
  });
});
