/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyticsServiceStart } from '@kbn/core/public';
import type { ProposalDecidedEvent } from '@kbn/agentic-investigations-plugin/public';
import { NIGHTSHIFT_EBT_EVENTS, reportNightshiftProposalDecided } from './ebt_events';

const reportEvent = jest.fn();
const analytics = { reportEvent } as unknown as AnalyticsServiceStart;

const event: ProposalDecidedEvent = {
  proposalId: 'p1',
  decision: 'decline',
  surface: 'chat',
  conversationId: 'conv-1',
  origin: 'nightshift',
  dismissReason: 'duplicate',
  category: 'customer-specific label',
  confidence: 'high',
  impact: 'low',
};

describe('reportNightshiftProposalDecided', () => {
  beforeEach(() => reportEvent.mockClear());

  it('maps the decision to the event fields and leaves the free-form category out', () => {
    reportNightshiftProposalDecided(analytics, event);

    expect(reportEvent).toHaveBeenCalledWith(NIGHTSHIFT_EBT_EVENTS.PROPOSAL_DECIDED, {
      proposal_id: 'p1',
      decision: 'decline',
      surface: 'chat',
      investigation_id: undefined,
      conversation_id: 'conv-1',
      dismiss_reason: 'duplicate',
      confidence: 'high',
      impact: 'low',
    });
  });

  it.each(['alertzero', 'agent_builder', 'context_engine', undefined] as const)(
    'ignores a proposal with origin %s',
    (origin) => {
      reportNightshiftProposalDecided(analytics, { ...event, origin });

      expect(reportEvent).not.toHaveBeenCalled();
    }
  );
});
