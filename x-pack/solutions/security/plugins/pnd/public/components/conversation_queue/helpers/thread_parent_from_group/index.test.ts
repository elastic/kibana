/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { deriveConversationIds, PND_GATE_IDS, type PndConversation } from '@kbn/pnd-common';

import { NO_INVESTIGATION_GROUP_KEY } from '../group_proposals_by_investigation';
import { threadParentFromGroup } from '.';

const ALERT_A = 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa';

const investigationConversation = ({
  correlationId,
  title,
}: {
  correlationId: string;
  title: string;
}): PndConversation => ({
  correlationId,
  createdAt: '2026-08-18T11:00:00.000Z',
  id: deriveConversationIds(correlationId).investigationConversationId,
  kind: 'investigation',
  title,
  updatedAt: '2026-08-18T11:30:00.000Z',
});

describe('threadParentFromGroup', () => {
  it('names the parent after the investigation conversation', () => {
    const parent = threadParentFromGroup({
      conversations: [
        investigationConversation({
          correlationId: ALERT_A,
          title: 'Beaconing from host-1',
        }),
      ],
      investigationGroup: {
        correlationId: ALERT_A,
        key: ALERT_A,
        proposals: [],
      },
    });

    expect(parent.title).toEqual('Beaconing from host-1');
  });

  it('addresses the parent as the investigation conversation id', () => {
    const parent = threadParentFromGroup({
      conversations: [
        investigationConversation({
          correlationId: ALERT_A,
          title: 'Beaconing from host-1',
        }),
      ],
      investigationGroup: {
        correlationId: ALERT_A,
        key: ALERT_A,
        proposals: [],
      },
    });

    expect(parent.id).toEqual(deriveConversationIds(ALERT_A).investigationConversationId);
  });

  it('falls back to a heading when the investigation conversation could not be read', () => {
    const parent = threadParentFromGroup({
      conversations: [],
      investigationGroup: {
        correlationId: ALERT_A,
        key: ALERT_A,
        proposals: [],
      },
    });

    expect(parent.title).toEqual('Investigation');
  });

  it('derives the investigation conversation id when the list has not landed', () => {
    const parent = threadParentFromGroup({
      conversations: [],
      investigationGroup: {
        correlationId: ALERT_A,
        key: ALERT_A,
        proposals: [],
      },
    });

    expect(parent.id).toEqual(deriveConversationIds(ALERT_A).investigationConversationId);
  });

  it('says plainly that a container-less group is not yet in an investigation', () => {
    const parent = threadParentFromGroup({
      conversations: [],
      investigationGroup: {
        key: NO_INVESTIGATION_GROUP_KEY,
        proposals: [
          {
            alwaysGate: false,
            correlationId: ALERT_A,
            createdAt: '2026-08-18T12:00:00.000Z',
            gateId: PND_GATE_IDS.openInvestigation,
            inputSchema: {},
            message: 'Open an investigation?',
            reasoning: 'Reasoning',
            recommendedAction: 'investigate',
            reversible: true,
            sourceId: 'open-a',
            stepExecutionId: 'step-open-a',
            stepId: 'await_investigate',
            title: 'Open an investigation?',
            workflowId: 'system-security-watch-floor',
            workflowRunId: 'run-open-a',
          },
        ],
      },
    });

    expect(parent.title).toEqual('Not yet in an investigation');
  });

  it('names a containment group after the incident conversation', () => {
    const parent = threadParentFromGroup({
      conversations: [
        {
          correlationId: ALERT_A,
          createdAt: '2026-08-18T11:00:00.000Z',
          id: deriveConversationIds(ALERT_A).incidentConversationId,
          kind: 'incident',
          title: 'Excel regsvr32 to Emotet persistence',
          updatedAt: '2026-08-18T11:30:00.000Z',
        },
      ],
      investigationGroup: {
        correlationId: ALERT_A,
        key: ALERT_A,
        proposals: [
          {
            alwaysGate: true,
            correlationId: ALERT_A,
            createdAt: '2026-08-18T12:00:00.000Z',
            gateId: PND_GATE_IDS.incidentContained,
            inputSchema: {},
            message: 'Confirm containment?',
            reasoning: 'Reasoning',
            recommendedAction: 'contain',
            reversible: false,
            sourceId: 'contain-a',
            stepExecutionId: 'step-contain-a',
            stepId: 'await_incident_contained',
            title: 'Confirm containment?',
            workflowId: 'system-security-watch-floor',
            workflowRunId: 'run-contain-a',
          },
        ],
      },
    });

    expect(parent.title).toEqual('Excel regsvr32 to Emotet persistence');
  });

  it('addresses a containment group as the incident conversation', () => {
    const parent = threadParentFromGroup({
      conversations: [],
      investigationGroup: {
        correlationId: ALERT_A,
        key: ALERT_A,
        proposals: [
          {
            alwaysGate: true,
            correlationId: ALERT_A,
            createdAt: '2026-08-18T12:00:00.000Z',
            gateId: PND_GATE_IDS.incidentContained,
            inputSchema: {},
            message: 'Confirm containment?',
            reasoning: 'Reasoning',
            recommendedAction: 'contain',
            reversible: false,
            sourceId: 'contain-a',
            stepExecutionId: 'step-contain-a',
            stepId: 'await_incident_contained',
            title: 'Confirm containment?',
            workflowId: 'system-security-watch-floor',
            workflowRunId: 'run-contain-a',
          },
        ],
      },
    });

    expect(parent.id).toEqual(deriveConversationIds(ALERT_A).incidentConversationId);
    expect(parent.title).toEqual('Incident');
  });

  it('summarises the parent with the discovery id, not a type badge', () => {
    const parent = threadParentFromGroup({
      conversations: [
        investigationConversation({
          correlationId: ALERT_A,
          title: 'Beaconing from host-1',
        }),
      ],
      investigationGroup: {
        correlationId: ALERT_A,
        key: ALERT_A,
        proposals: [],
      },
    });

    expect(parent.summary).toEqual(ALERT_A);
  });
});
