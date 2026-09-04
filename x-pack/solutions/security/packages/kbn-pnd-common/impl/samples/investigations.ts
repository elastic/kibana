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
  TEMPLATE_ID_INVESTIGATION,
} from '../../constants';
import type { Investigation } from '../schemas/components/investigation.gen';

/**
 * A clean Floor run that classifies an alert as false_positive with high confidence
 * produces NO investigation row — the watch execution completes without materializing
 * a conversation. Only inconclusive or true_positive classifications spawn investigations.
 *
 * Brief fixtures below track Throughline decision groups (Contain / Escalate /
 * Investigate / Tune) while staying on the Investigation → Proposal object model.
 */
export const MOCK_CLEAN_RUN_NOTE =
  'Clean Floor runs (false_positive, confidence >= 0.9) do not create investigation rows.';

const containInvestigations: Investigation[] = [
  {
    id: 'inv-officer-impossible-travel-001',
    template_id: TEMPLATE_ID_INVESTIGATION,
    title: 'Impossible travel — exec account (cfo@corp)',
    createdAt: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
    watch_id: SYSTEM_SECURITY_WATCH_OFFICER_ID,
    watch_execution_id: 'exec-officer-20260720-1310',
    watch_tier: 'officer',
    severity: 'critical',
    assignee: null,
    status: 'open',
    pendingProposalCount: 2,
    recommendedAction: 'contain',
    affectedSurface: 'cfo@corp',
    summary:
      'MFA was satisfied from two countries in 40 minutes — that reads as a stolen session token, not a guessed password. The CFO’s live sessions are the blast radius.',
    priorityScore: 94,
    recordId: 'CASE-2047',
    primaryActionLabel: 'Revoke active sessions',
    events: [
      {
        id: 'evt-it-001',
        timestamp: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
        type: 'triage',
        summary: 'Impossible-travel alert · Okta + M365',
        actor: SYSTEM_SECURITY_WATCH_OFFICER_ID,
      },
      {
        id: 'evt-it-002',
        timestamp: new Date(Date.now() - 6 * 60 * 1000).toISOString(),
        type: 'classification',
        summary: 'true_positive · confidence 0.94 · session token likely',
        actor: 'alert-analysis',
      },
    ],
  },
  {
    id: 'inv-officer-sales-nas-002',
    template_id: TEMPLATE_ID_INVESTIGATION,
    title: 'Ransomware encryption — Sales file server',
    createdAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    watch_id: SYSTEM_SECURITY_WATCH_OFFICER_ID,
    watch_execution_id: 'exec-officer-20260720-0820',
    watch_tier: 'officer',
    severity: 'critical',
    assignee: 'analyst.mrodriguez',
    status: 'open',
    pendingProposalCount: 1,
    recommendedAction: 'contain',
    affectedSurface: 'Sales-NAS',
    summary:
      'Overnight encryption on the Sales NAS — 1,431 files renamed in four minutes before the writing process died. Spread stayed local to one share.',
    priorityScore: 89,
    recordId: 'INC-2031',
    primaryActionLabel: 'Isolate Sales-NAS',
    events: [
      {
        id: 'evt-nas-001',
        timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
        type: 'triage',
        summary: 'Mass rename · ransomware pattern',
        actor: SYSTEM_SECURITY_WATCH_OFFICER_ID,
      },
    ],
  },
  {
    id: 'inv-floor-domain-admins-003',
    template_id: TEMPLATE_ID_INVESTIGATION,
    title: 'Unauthorized Domain Admins elevation',
    createdAt: new Date(Date.now() - 14 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 13 * 60 * 1000).toISOString(),
    watch_id: SYSTEM_SECURITY_WATCH_FLOOR_ID,
    watch_execution_id: 'exec-floor-20260720-0243',
    watch_tier: 'floor',
    severity: 'high',
    assignee: null,
    status: 'open',
    pendingProposalCount: 1,
    recommendedAction: 'contain',
    affectedSurface: 'svc-helpdesk',
    summary:
      'svc-helpdesk was added to Domain Admins at 02:43, inside the FIN-WS-04 attack window — no change ticket. Morning sweep surfaced it 11 minutes ago.',
    priorityScore: 82,
    recordId: 'CASE-2049',
    primaryActionLabel: 'Remove from Domain Admins',
    events: [
      {
        id: 'evt-da-001',
        timestamp: new Date(Date.now() - 14 * 60 * 1000).toISOString(),
        type: 'triage',
        summary: 'AD group change · Domain Admins',
        actor: SYSTEM_SECURITY_WATCH_FLOOR_ID,
      },
    ],
  },
  {
    id: 'inv-officer-sales-nas-isolation-004',
    template_id: TEMPLATE_ID_INVESTIGATION,
    title: 'Isolation in progress — Sales-NAS',
    createdAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 11 * 60 * 1000).toISOString(),
    watch_id: SYSTEM_SECURITY_WATCH_OFFICER_ID,
    watch_execution_id: 'exec-officer-20260720-0910',
    watch_tier: 'officer',
    severity: 'high',
    assignee: 'oncall.sec-team',
    status: 'in-progress',
    pendingProposalCount: 0,
    recommendedAction: 'contain',
    affectedSurface: 'Sales-NAS',
    summary:
      'Network isolation is executing — share offline for users while SNAP-7740 restore prepares. No decision needed until the run finishes.',
    priorityScore: 78,
    recordId: 'INC-2032',
    primaryActionLabel: 'Cancel isolation',
    events: [
      {
        id: 'evt-iso-001',
        timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
        type: 'action',
        summary: 'Isolation started · Sales-NAS',
        actor: SYSTEM_SECURITY_WATCH_OFFICER_ID,
      },
    ],
  },
];

const escalateInvestigations: Investigation[] = [
  {
    id: 'inv-floor-findb-staged-005',
    template_id: TEMPLATE_ID_INVESTIGATION,
    title: 'Staged archive — FIN-DB-02',
    createdAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 9 * 60 * 1000).toISOString(),
    watch_id: SYSTEM_SECURITY_WATCH_FLOOR_ID,
    watch_execution_id: 'exec-floor-20260720-1140',
    watch_tier: 'floor',
    severity: 'high',
    assignee: null,
    status: 'open',
    pendingProposalCount: 1,
    recommendedAction: 'escalate',
    affectedSurface: 'FIN-DB-02',
    summary:
      'A 4.2 GB archive was assembled in C:\\temp on FIN-DB-02 from finance exports. Nothing has left the host yet — staged, not exfiltrated.',
    priorityScore: 74,
    recordId: 'CASE-2051',
    primaryActionLabel: 'Block egress on FIN-DB-02',
    events: [
      {
        id: 'evt-db-001',
        timestamp: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
        type: 'triage',
        summary: 'true_positive · confidence 0.81 · staged archive',
        actor: 'alert-analysis',
      },
    ],
  },
  {
    id: 'inv-floor-phishing-url-006',
    template_id: TEMPLATE_ID_INVESTIGATION,
    title: 'Phishing — invoice lure (Finance)',
    createdAt: new Date(Date.now() - 16.5 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    watch_id: SYSTEM_SECURITY_WATCH_FLOOR_ID,
    watch_execution_id: 'exec-floor-20260720-1005',
    watch_tier: 'floor',
    severity: 'medium',
    assignee: 'analyst.jchen',
    status: 'open',
    pendingProposalCount: 1,
    recommendedAction: 'escalate',
    affectedSurface: 'okta-sso',
    summary:
      'Four Finance users clicked an invoice lure; one credential submission confirmed. URL still reachable — fleet block recommended before broader spread.',
    priorityScore: 66,
    recordId: 'CASE-2038',
    primaryActionLabel: 'Block the URL fleet-wide',
    events: [
      {
        id: 'evt-phish-001',
        timestamp: new Date(Date.now() - 16.5 * 60 * 1000).toISOString(),
        type: 'triage',
        summary: 'Phishing cluster · 4 users',
        actor: SYSTEM_SECURITY_WATCH_FLOOR_ID,
      },
    ],
  },
];

const investigateInvestigations: Investigation[] = [
  {
    id: 'inv-dark-beacon-corroborated-001',
    template_id: TEMPLATE_ID_INVESTIGATION,
    title: 'Corroborated C2 beacon · host-srv-db02 + host-srv-app01',
    createdAt: new Date(Date.now() - 16.5 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
    watch_id: SYSTEM_SECURITY_WATCH_DARK_ID,
    watch_execution_id: 'exec-dark-20260720-0300',
    watch_tier: 'dark',
    severity: 'critical',
    assignee: 'oncall.sec-team',
    status: 'in-progress',
    pendingProposalCount: 1,
    recommendedAction: 'investigate',
    affectedSurface: 'host-srv-db02',
    summary:
      'Hunt Watch sweep corroborated a Floor beacon alert. Both hosts beaconing to the same C2 with a shared persistence mechanism — take over to deepen scope.',
    priorityScore: 71,
    recordId: 'CASE-2054',
    primaryActionLabel: 'Take over',
    events: [
      {
        id: 'evt-200',
        timestamp: new Date(Date.now() - 16.5 * 60 * 1000).toISOString(),
        type: 'sweep',
        summary: 'Scheduled Hunt Watch sweep started',
        actor: SYSTEM_SECURITY_WATCH_DARK_ID,
      },
      {
        id: 'evt-201',
        timestamp: new Date(Date.now() - 16.25 * 60 * 1000).toISOString(),
        type: 'corroboration',
        summary: 'Linked beacon hosts · confidence raised to 0.94',
        actor: SYSTEM_SECURITY_WATCH_DARK_ID,
      },
    ],
  },
];

const tuneInvestigations: Investigation[] = [
  {
    id: 'inv-floor-oauth-tune-007',
    template_id: TEMPLATE_ID_INVESTIGATION,
    title: 'OAuth token abuse · app-salesforce-sync',
    createdAt: new Date(Date.now() - 16.5 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    watch_id: SYSTEM_SECURITY_WATCH_FLOOR_ID,
    watch_execution_id: 'exec-floor-20260720-1115',
    watch_tier: 'floor',
    severity: 'low',
    status: 'open',
    pendingProposalCount: 1,
    recommendedAction: 'tune',
    affectedSurface: 'app-salesforce-sync',
    summary:
      'Volume spike within the expected batch window. Rule threshold looks too sensitive for this SaaS sync pattern — review the tuning proposal.',
    priorityScore: 41,
    recordId: 'CASE-2056',
    primaryActionLabel: 'Review tuning',
    events: [],
  },
];

/** Auto-resolved receipts — leave the Brief queue (closed) but keep fixtures for history demos. */
const resolvedInvestigations: Investigation[] = [
  {
    id: 'inv-dark-mailbox-auto-008',
    template_id: TEMPLATE_ID_INVESTIGATION,
    title: 'Mailbox forwarding rule removed — j.reyes',
    createdAt: new Date(Date.now() - 44 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 23 * 60 * 1000).toISOString(),
    watch_id: SYSTEM_SECURITY_WATCH_DARK_ID,
    watch_execution_id: 'exec-dark-20260720-0110',
    watch_tier: 'dark',
    severity: 'medium',
    status: 'auto-resolved',
    pendingProposalCount: 0,
    recommendedAction: 'contain',
    affectedSurface: 'j.reyes@corp',
    summary:
      'Hunt Watch removed a mailbox exfil rule on j.reyes and closed the case — resolved autonomously, full evidence trail in the record.',
    priorityScore: 0,
    recordId: 'CASE-2043',
    primaryActionLabel: 'Reviewed — file it',
    events: [
      {
        id: 'evt-auto-001',
        timestamp: new Date(Date.now() - 44 * 60 * 60 * 1000).toISOString(),
        type: 'resolution',
        summary: 'Resolved autonomously · 0 messages forwarded',
        actor: SYSTEM_SECURITY_WATCH_DARK_ID,
      },
    ],
  },
];

export const MOCK_INVESTIGATIONS: Investigation[] = [
  ...containInvestigations,
  ...escalateInvestigations,
  ...investigateInvestigations,
  ...tuneInvestigations,
  ...resolvedInvestigations,
];

export const createMockInvestigation = (overrides: Partial<Investigation> = {}): Investigation => ({
  ...containInvestigations[0],
  ...overrides,
  events: overrides.events ?? containInvestigations[0].events,
});

export const getMockInvestigationsByWatchId = (watchId: string): Investigation[] =>
  MOCK_INVESTIGATIONS.filter((inv) => inv.watch_id === watchId);

export const getMockInvestigationById = (id: string): Investigation | undefined =>
  MOCK_INVESTIGATIONS.find((inv) => inv.id === id);
