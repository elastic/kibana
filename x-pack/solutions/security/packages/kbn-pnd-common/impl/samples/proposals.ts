/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SYSTEM_SECURITY_WATCH_DARK_ID,
  SYSTEM_SECURITY_WATCH_FLOOR_ID,
  SYSTEM_SECURITY_WATCH_OFFICER_ID,
  TEMPLATE_ID_PROPOSAL,
} from '../../constants';
import type { Proposal } from '../schemas/components/investigation.gen';

export const MOCK_PROPOSALS: Proposal[] = [
  {
    id: 'prop-impossible-travel-revoke-001',
    template_id: TEMPLATE_ID_PROPOSAL,
    parentConversationId: 'inv-officer-impossible-travel-001',
    type: 'contain',
    confidence: 0.94,
    reasoning:
      'MFA satisfied from two geos in 40 minutes. Live sessions are the blast radius — revoke before mailbox rules fire.',
    evidenceRefs: [
      { id: 'alert-it-001', type: 'alert', label: 'Impossible travel · Okta' },
      { id: 'evidence-sessions', type: 'enrichment', label: '3 active sessions · Okta + M365' },
    ],
    status: 'pending',
    assignee: null,
    sla: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
    events: [
      {
        id: 'pevt-001',
        timestamp: '2026-07-20T14:05:00Z',
        type: 'proposal_created',
        summary: 'Session revoke proposal drafted by Watch Officer',
        actor: SYSTEM_SECURITY_WATCH_OFFICER_ID,
      },
    ],
    sourceWatchId: SYSTEM_SECURITY_WATCH_OFFICER_ID,
    approvalRequired: true,
    summary: 'Revoke every live session for cfo@corp across Okta and Microsoft 365',
    recommendation: 'Revoke sessions · remove 09:43 forwarding rule',
  },
  {
    id: 'prop-impossible-travel-reset-002',
    template_id: TEMPLATE_ID_PROPOSAL,
    parentConversationId: 'inv-officer-impossible-travel-001',
    type: 'contain',
    confidence: 0.88,
    reasoning: 'Force password + MFA re-enrollment after session revoke to close the token path.',
    evidenceRefs: [{ id: 'evidence-mfa', type: 'enrichment', label: 'MFA enrollment state' }],
    status: 'pending',
    assignee: null,
    sla: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    events: [],
    sourceWatchId: SYSTEM_SECURITY_WATCH_OFFICER_ID,
    approvalRequired: true,
    summary: 'Force password reset and MFA re-enrollment for cfo@corp',
    recommendation: 'Enforce reset at next sign-in',
  },
  {
    id: 'prop-sales-nas-isolate-003',
    template_id: TEMPLATE_ID_PROPOSAL,
    parentConversationId: 'inv-officer-sales-nas-002',
    type: 'contain',
    confidence: 0.89,
    reasoning:
      '1,431 files renamed in four minutes. Isolate the share before restoring from SNAP-7740.',
    evidenceRefs: [
      { id: 'evidence-nas-files', type: 'log', label: 'Mass rename · Sales-NAS' },
      { id: 'evidence-snap', type: 'document', label: 'SNAP-7740' },
    ],
    status: 'pending',
    assignee: 'analyst.mrodriguez',
    sla: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
    events: [],
    sourceWatchId: SYSTEM_SECURITY_WATCH_OFFICER_ID,
    approvalRequired: true,
    summary: 'Cut Sales-NAS off the network pending restore',
    recommendation: 'Isolate share · begin SNAP-7740 restore',
  },
  {
    id: 'prop-domain-admins-remove-004',
    template_id: TEMPLATE_ID_PROPOSAL,
    parentConversationId: 'inv-floor-domain-admins-003',
    type: 'contain',
    confidence: 0.82,
    reasoning:
      'svc-helpdesk elevated to Domain Admins with no change ticket inside the FIN-WS-04 window.',
    evidenceRefs: [{ id: 'evidence-ad-audit', type: 'log', label: 'AD group change audit' }],
    status: 'pending',
    assignee: null,
    sla: new Date(Date.now() + 1 * 60 * 60 * 1000).toISOString(),
    events: [],
    sourceWatchId: SYSTEM_SECURITY_WATCH_FLOOR_ID,
    approvalRequired: true,
    summary: 'Remove svc-helpdesk from Domain Admins',
    recommendation: 'Revert unauthorized elevation',
  },
  {
    id: 'prop-findb-egress-005',
    template_id: TEMPLATE_ID_PROPOSAL,
    parentConversationId: 'inv-floor-findb-staged-005',
    type: 'escalate',
    confidence: 0.74,
    reasoning:
      '4.2 GB archive staged on FIN-DB-02. Block egress so it cannot leave while IR investigates.',
    evidenceRefs: [{ id: 'evidence-archive', type: 'log', label: 'C:\\temp archive · 4.2 GB' }],
    status: 'pending',
    assignee: null,
    sla: new Date(Date.now() + 2.5 * 60 * 60 * 1000).toISOString(),
    events: [],
    sourceWatchId: SYSTEM_SECURITY_WATCH_FLOOR_ID,
    approvalRequired: true,
    summary: 'Apply egress block on FIN-DB-02',
    recommendation: 'Block egress · keep host reachable for IR',
  },
  {
    id: 'prop-phishing-block-006',
    template_id: TEMPLATE_ID_PROPOSAL,
    parentConversationId: 'inv-floor-phishing-url-006',
    type: 'escalate',
    confidence: 0.66,
    reasoning: 'Invoice lure URL still reachable after one credential submission — fleet block.',
    evidenceRefs: [{ id: 'evidence-url', type: 'enrichment', label: 'Phishing URL reputation' }],
    status: 'pending',
    assignee: 'analyst.jchen',
    sla: new Date(Date.now() + 1.5 * 60 * 60 * 1000).toISOString(),
    events: [],
    sourceWatchId: SYSTEM_SECURITY_WATCH_FLOOR_ID,
    approvalRequired: true,
    summary: 'Block phishing URL fleet-wide',
    recommendation: 'Proxy + mail gateway block',
  },
  {
    id: 'prop-beacon-contain-007',
    template_id: TEMPLATE_ID_PROPOSAL,
    parentConversationId: 'inv-dark-beacon-corroborated-001',
    type: 'contain',
    confidence: 0.91,
    reasoning:
      'Dark Watch corroboration raised confidence to 0.94. Containment draft ready once analyst takes over.',
    evidenceRefs: [
      { id: 'evidence-c2', type: 'enrichment', label: 'Shared C2 endpoint' },
      { id: 'evidence-persist', type: 'edr', label: 'Shared persistence mechanism' },
    ],
    status: 'pending',
    assignee: 'oncall.sec-team',
    sla: new Date(Date.now() + 2.5 * 60 * 60 * 1000).toISOString(),
    events: [],
    sourceWatchId: SYSTEM_SECURITY_WATCH_DARK_ID,
    approvalRequired: true,
    summary: 'Isolate beaconing hosts after take-over review',
    recommendation: 'Network isolate · preserve memory',
  },
  {
    id: 'prop-oauth-tune-008',
    template_id: TEMPLATE_ID_PROPOSAL,
    parentConversationId: 'inv-floor-oauth-tune-007',
    type: 'tune',
    confidence: 0.71,
    reasoning:
      'Salesforce sync volume matches the expected batch window. Threshold should exclude this SaaS pattern.',
    evidenceRefs: [{ id: 'evidence-baseline', type: 'log', label: '30d OAuth volume baseline' }],
    status: 'pending',
    assignee: null,
    sla: new Date(Date.now() + 1.5 * 60 * 60 * 1000).toISOString(),
    events: [],
    sourceWatchId: SYSTEM_SECURITY_WATCH_FLOOR_ID,
    approvalRequired: true,
    summary: 'Raise OAuth token-abuse threshold for app-salesforce-sync',
    recommendation: 'Add exception · keep alerting on outliers',
  },
];

export const createMockProposal = (overrides: Partial<Proposal> = {}): Proposal => ({
  ...MOCK_PROPOSALS[0],
  ...overrides,
  events: overrides.events ?? MOCK_PROPOSALS[0].events,
  evidenceRefs: overrides.evidenceRefs ?? MOCK_PROPOSALS[0].evidenceRefs,
});

export const getMockProposalsByInvestigationId = (investigationId: string): Proposal[] =>
  MOCK_PROPOSALS.filter((proposal) => proposal.parentConversationId === investigationId);

export const getMockProposalById = (id: string): Proposal | undefined =>
  MOCK_PROPOSALS.find((proposal) => proposal.id === id);
