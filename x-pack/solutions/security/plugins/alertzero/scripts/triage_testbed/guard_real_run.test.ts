/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GuardLimits, ModelCall, WorkerSettings } from './guard_real_run';
import { evaluateGuard, patchableSettings, unfinishedQuery } from './guard_real_run';

const HAIKU = '.anthropic-claude-4.5-haiku-chat_completion';
const FAKE = 'fake-connector-id';
const limits: GuardLimits = { maxCalls: 80, maxInputTokens: 700000, maxOutputTokens: 200000 };
const done = (connectorId: string, inputTokens = 5000, outputTokens = 1000): ModelCall => ({
  status: 'completed',
  connectorId,
  inputTokens,
  outputTokens,
});
const evaluate = (calls: ModelCall[], alsoAllowed = [FAKE]) =>
  evaluateGuard({ calls, expectedConnector: HAIKU, alsoAllowed, limits });

describe('evaluateGuard', () => {
  it('lets a run continue while every call went to the expected connector and the caps hold', () => {
    expect(evaluate([done(HAIKU), done(HAIKU), done(FAKE)])).toEqual({
      stop: false,
      calls: 3,
      inputTokens: 15000,
      outputTokens: 3000,
    });
  });

  it('stops when a completed call was answered by another connector, the mistake of the first sweep', () => {
    const result = evaluate([done(HAIKU), done('.openai-gpt-6-luna-chat_completion')]);

    expect(result.stop).toBe(true);
    expect(result.reason).toContain('.openai-gpt-6-luna-chat_completion');
  });

  it('does not stop for a call that has no connector yet, because a running call has no output', () => {
    expect(evaluate([{ status: 'running' }, done(HAIKU)]).stop).toBe(false);
  });

  it('stops above the cap of calls, failed calls included, because a failing retry loop costs too', () => {
    const calls = Array.from({ length: 81 }, () => ({ status: 'failed' }));

    expect(evaluate(calls)).toEqual({ stop: true, reason: '81 calls, more than the cap of 80' });
  });

  it('stops above the cap of input tokens and above the cap of output tokens', () => {
    expect(evaluate([done(HAIKU, 700001, 0)]).reason).toContain('input tokens');
    expect(evaluate([done(HAIKU, 0, 200001)]).reason).toContain('output tokens');
    expect(evaluate([done(HAIKU, 700000, 200000)]).stop).toBe(false);
  });

  it('stops for the fake connector when the fake is not allowed, so that an unexpected route is seen', () => {
    expect(evaluate([done(FAKE)], []).stop).toBe(true);
  });
});

describe('patchableSettings', () => {
  it('drops the worker id that the PATCH of a worker rejects, and keeps what it accepts', () => {
    const fromGet: WorkerSettings = {
      workerId: 'system-security-floor-alert-triage',
      serviceAccountId: 'kibana/alertzero_alert_triage',
      autonomy: 'manual',
      scheduleInterval: '15m',
      extras: { budgetPerHour: 300 },
    };

    expect(patchableSettings(fromGet)).toEqual({
      serviceAccountId: 'kibana/alertzero_alert_triage',
      autonomy: 'manual',
      scheduleInterval: '15m',
      extras: { budgetPerHour: 300 },
    });
    expect(patchableSettings({ ...fromGet, serviceAccountId: undefined })).not.toHaveProperty(
      'serviceAccountId'
    );
  });
});

describe('unfinishedQuery', () => {
  it('counts only the workflows that do the analysis, so that proposals waiting for a human do not keep the run open', () => {
    const query = unfinishedQuery('2026-11-16T21:37:00Z');
    const workflowIds = query.bool.filter.find((f) => f.terms?.workflowId)?.terms?.workflowId;

    expect(workflowIds).toEqual([
      'system-security-floor-alert-triage-default',
      'system-security-floor-alert-triage-batch',
      'system-security-alert-analysis',
    ]);
    // The reviews and the proposals are not in the list.
    expect(workflowIds?.some((id: string) => /review|proposal/.test(id))).toBe(false);
  });

  it('leaves out the executions that have finished, and starts at the beginning of the run', () => {
    const query = unfinishedQuery('2026-11-16T21:37:00Z');

    expect(query.bool.must_not[0].terms.status).toEqual([
      'completed',
      'failed',
      'cancelled',
      'timed_out',
      'skipped',
    ]);
    expect(query.bool.filter[0]).toEqual({ range: { createdAt: { gte: '2026-11-16T21:37:00Z' } } });
  });
});
