/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InvestigationSeed } from '@kbn/investigation-seed';
import type { InvestigationLead } from '@kbn/signal-investigation-contract';
import {
  MAX_ATTACHMENT_LEADS,
  MAX_ATTACHMENT_PLAN_ITEMS,
  OBSERVABILITY_ALERT_ATTACHMENT_TYPE_ID,
  SIGNAL_INVESTIGATION_FINDINGS_ATTACHMENT_TYPE_ID,
  buildSignalInvestigationChatAttachments,
  buildSignalInvestigationFindingsPayload,
  formatSignalInvestigationFindingsForAgent,
  signalInvestigationFindingsAttachmentSchema,
} from './findings_attachment';

const makeSeed = (overrides: Partial<InvestigationSeed> = {}): InvestigationSeed => ({
  origin: { app: 'alerts', alertId: 'alert-42', ruleTypeId: 'apm.transaction_error_rate' },
  timeRange: { from: '2026-11-02T11:00:00.000Z', to: '2026-11-02T12:00:00.000Z' },
  filters: [],
  entities: { 'service.name': 'checkout' },
  ...overrides,
});

const makeLead = (index: number): InvestigationLead => ({
  id: `lead-${index}`,
  analyzerId: 'dependency_change_points',
  summary: `Latency spike on redis-${index}`,
  occurredAt: '2026-11-02T11:15:00.000Z',
  relevance: 'One-hop dependency redis',
  ranking: {
    signal: 'strong',
    timing: 'during',
    relationship: 'dependency',
  },
});

describe('signalInvestigationFindingsAttachmentSchema', () => {
  it('accepts a valid findings payload and rejects oversized plan or lead arrays', () => {
    const valid = buildSignalInvestigationFindingsPayload({
      seed: makeSeed(),
      plan: [
        {
          id: 'dependency_change_points',
          name: 'Dependency change points',
          technique: 'Change point detection',
          status: 'found',
          foundCount: 1,
        },
      ],
      leads: [makeLead(1)],
    });

    expect(signalInvestigationFindingsAttachmentSchema.safeParse(valid).success).toBe(true);

    const tooManyPlanItems = {
      ...valid,
      plan: Array.from({ length: MAX_ATTACHMENT_PLAN_ITEMS + 1 }, (_, index) => ({
        id: `analyzer-${index}`,
        name: `Analyzer ${index}`,
        technique: 'Change point detection',
        status: 'no_change' as const,
        foundCount: 0,
      })),
    };
    expect(signalInvestigationFindingsAttachmentSchema.safeParse(tooManyPlanItems).success).toBe(
      false
    );

    const tooManyLeads = {
      ...valid,
      leads: Array.from({ length: MAX_ATTACHMENT_LEADS + 1 }, (_, index) => makeLead(index)),
    };
    expect(signalInvestigationFindingsAttachmentSchema.safeParse(tooManyLeads).success).toBe(false);
  });

  it('includes observability.alert alongside platform.signal_investigation.findings for alert origins only', () => {
    const alertAttachments = buildSignalInvestigationChatAttachments({
      seed: makeSeed(),
      plan: [],
      leads: [makeLead(1)],
    });

    expect(alertAttachments.map((item) => item.type)).toEqual([
      OBSERVABILITY_ALERT_ATTACHMENT_TYPE_ID,
      SIGNAL_INVESTIGATION_FINDINGS_ATTACHMENT_TYPE_ID,
    ]);
    expect(alertAttachments[0]).toEqual({
      id: 'alert-42',
      type: OBSERVABILITY_ALERT_ATTACHMENT_TYPE_ID,
      data: { alertId: 'alert-42' },
    });

    const discoverAttachments = buildSignalInvestigationChatAttachments({
      seed: makeSeed({ origin: { app: 'discover', surface: 'appMenu' } }),
      plan: [],
      leads: [makeLead(1)],
    });
    expect(discoverAttachments.map((item) => item.type)).toEqual([
      SIGNAL_INVESTIGATION_FINDINGS_ATTACHMENT_TYPE_ID,
    ]);
  });

  it('formats findings with the non-causal verification reminder and optional user verdicts', () => {
    const payload = buildSignalInvestigationFindingsPayload({
      seed: makeSeed(),
      plan: [
        {
          id: 'dependency_change_points',
          name: 'Dependency change points',
          technique: 'Change point detection',
          status: 'found',
          foundCount: 1,
        },
      ],
      leads: [makeLead(1), makeLead(2)],
      feedbackByLead: { 'lead-1': 'useful', 'lead-2': 'not_useful' },
    });

    expect(signalInvestigationFindingsAttachmentSchema.safeParse(payload).success).toBe(true);
    expect(payload.leads[0].verdict).toBe('useful');
    expect(payload.leads[1].verdict).toBe('not_useful');

    const text = formatSignalInvestigationFindingsForAgent(payload);
    expect(text).toContain('service.name=checkout');
    expect(text).toContain('Latency spike on redis-1');
    expect(text).toContain('userVerdict=useful');
    expect(text).toContain('userVerdict=not_useful');
    expect(text).toContain('verify with tools');
  });
});
