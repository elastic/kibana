/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. See the "Elastic License 2.0" for
 * details.
 */

import { TEMPLATE_VERSION_CURRENT } from '@kbn/pnd-common';
import type { ListInvestigationsResponse } from '@kbn/pnd-common';
import type { ListInvestigationProposalsResponse } from '@kbn/pnd-common';

const EXEC_ID = '8645f854-ef6e-45cc-b5c5-3285fdf52d0d';

export const realInvestigations: ListInvestigationsResponse['investigations'] = [
  {
    id: 'inv-dark-chrysalis-001',
    template_id: 'investigation' as const,
    template_version: TEMPLATE_VERSION_CURRENT,
    title: 'Chrysalis Backdoor — endpoint beaconing to known C2',
    createdAt: '2026-07-23T00:18:14Z',
    updatedAt: '2026-07-23T00:22:30Z',
    watch_id: 'system-security-watch-dark',
    watch_execution_id: EXEC_ID,
    watch_tier: 'dark' as const,
    severity: 'critical',
    assignee: null,
    status: 'open',
    pendingProposalCount: 1,
    recommendedAction: 'escalate' as const,
    affectedSurface: 'endpoint-lab-vm (192.168.252.23)',
    summary:
      'Dark Watch sweep correlated threat report "Chrysalis Backdoor Campaign" (T1547.001, T1071.001) with endpoint telemetry. Process svchost_update.exe matched known IoC hash. Network beaconing to 185.220.101.47:443 detected. Escalated to Deep Watch for forensic analysis.',
    priorityScore: 92,
    recordId: 'CASE-9001',
    primaryActionLabel: 'Escalate to Deep Watch',
    events: [
      {
        id: 'evt-dark-001',
        timestamp: '2026-07-23T00:18:14Z',
        type: 'triage',
        summary: 'Dark Watch hunt sweep triggered — threat intel correlation',
        actor: 'system-security-watch-dark',
      },
      {
        id: 'evt-dark-002',
        timestamp: '2026-07-23T00:18:20Z',
        type: 'classification',
        summary: 'IoC match: a3f5e8b2c1d4f6a7... to Chrysalis Backdoor (T1547.001)',
        actor: 'threat-intel-hunt',
      },
      {
        id: 'evt-dark-003',
        timestamp: '2026-07-23T00:19:05Z',
        type: 'evidence',
        summary: 'Network beacon to 185.220.101.47:443 every 30s (T1071.001)',
        actor: 'threat-intel-hunt',
      },
      {
        id: 'evt-dark-004',
        timestamp: '2026-07-23T00:20:00Z',
        type: 'escalation',
        summary: 'Escalated to Deep Watch for specialist forensic analysis',
        actor: 'system-security-watch-dark',
      },
    ],
  },
  {
    id: 'inv-dark-credential-dump-002',
    template_id: 'investigation' as const,
    template_version: TEMPLATE_VERSION_CURRENT,
    title: 'Credential harvesting tool detected on production endpoint',
    createdAt: '2026-07-23T00:18:15Z',
    updatedAt: '2026-07-23T00:21:00Z',
    watch_id: 'system-security-watch-dark',
    watch_execution_id: EXEC_ID,
    watch_tier: 'dark' as const,
    severity: 'high',
    assignee: null,
    status: 'open',
    pendingProposalCount: 1,
    recommendedAction: 'contain' as const,
    affectedSurface: 'endpoint-lab-vm',
    summary:
      'Threat intelligence digest flagged credential dumping activity (T1003.001) — process lsass_reader.exe accessing LSASS memory. Memory dump file creation detected. Dark Watch recommends immediate network isolation pending Deep Watch verification.',
    priorityScore: 85,
    recordId: 'CASE-9002',
    primaryActionLabel: 'Isolate endpoint',
    events: [
      {
        id: 'evt-cred-001',
        timestamp: '2026-07-23T00:18:15Z',
        type: 'triage',
        summary: 'Threat intel digest: credential harvesting pattern detected',
        actor: 'system-security-watch-dark',
      },
      {
        id: 'evt-cred-002',
        timestamp: '2026-07-23T00:19:30Z',
        type: 'evidence',
        summary: 'LSASS memory access by lsass_reader.exe (T1003.001)',
        actor: 'threat-intel-hunt',
      },
    ],
  },
  {
    id: 'inv-floor-chain-100',
    template_id: 'investigation' as const,
    template_version: TEMPLATE_VERSION_CURRENT,
    title:
      'FIN-WS-07 — Full escalation chain: Cobalt Strike beacon (Floor → Dark → Deep → Detection)',
    createdAt: '2026-07-24T03:00:00Z',
    updatedAt: '2026-07-24T03:42:00Z',
    watch_id: 'system-security-watch-floor',
    watch_execution_id: EXEC_ID,
    watch_tier: 'floor' as const,
    severity: 'critical',
    assignee: null,
    status: 'escalated',
    pendingProposalCount: 1,
    recommendedAction: 'escalate' as const,
    affectedSurface: 'FIN-WS-07 (10.42.1.19) — Finance Workstation',
    summary:
      "Floor detected an anomalous process spawn and handed off to Dark Watch, whose threat-intel correlation matched a Cobalt Strike IoC. Deep Watch's forensic sweep confirmed lateral-movement staging, and Detection Watch drafted a rule-creation proposal to close the gap the existing ruleset missed. One investigation, one continuous escalation thread across all four tiers.",
    priorityScore: 97,
    recordId: 'CASE-9200',
    primaryActionLabel: 'Review decision',
    // This investigation exists specifically to demonstrate the full
    // Floor -> Dark -> Deep -> Detection escalation chain as a single
    // continuous thread in the Investigation Detail Timeline diagram (see
    // investigation_flow_diagram.tsx). Every other seeded investigation is
    // single-tier or short-circuits (e.g. Floor -> Officer directly, per
    // watch_floor_orchestrator.yaml's confidence-gated escalate_to_dark
    // step); this one exercises all four `actor` tiers in one events[].
    events: [
      {
        id: 'evt-chain-01',
        timestamp: '2026-07-24T03:00:00Z',
        type: 'triage',
        summary: 'Anomalous child process: winword.exe spawned powershell.exe -enc (FIN-WS-07)',
        actor: 'system-security-watch-floor',
      },
      {
        id: 'evt-chain-02',
        timestamp: '2026-07-24T03:04:00Z',
        type: 'escalation',
        summary:
          'Confidence 0.81 ≥ threshold — escalated to Dark Watch for threat-intel correlation',
        actor: 'system-security-watch-floor',
      },
      {
        id: 'evt-chain-03',
        timestamp: '2026-07-24T03:09:00Z',
        type: 'classification',
        summary: 'IoC hash match: decoded payload matches Cobalt Strike stager (T1059.001)',
        actor: 'system-security-watch-dark',
      },
      {
        id: 'evt-chain-04',
        timestamp: '2026-07-24T03:12:00Z',
        type: 'evidence',
        summary: 'C2 beacon to 91.219.237.14:443 every 45s, jitter 20% (T1071.001)',
        actor: 'system-security-watch-dark',
      },
      {
        id: 'evt-chain-05',
        timestamp: '2026-07-24T03:16:00Z',
        type: 'escalation',
        summary: 'Confidence 0.89 ≥ threshold — escalated to Deep Watch for forensic verification',
        actor: 'system-security-watch-dark',
      },
      {
        id: 'evt-chain-06',
        timestamp: '2026-07-24T03:21:00Z',
        type: 'evidence',
        summary: 'Memory forensics: reflective DLL injection into explorer.exe confirmed',
        actor: 'system-security-watch-deep',
      },
      {
        id: 'evt-chain-07',
        timestamp: '2026-07-24T03:27:00Z',
        type: 'evidence',
        summary: 'Lateral movement staging: SMB admin-share enumeration toward FIN-DC-01',
        actor: 'system-security-watch-deep',
      },
      {
        id: 'evt-chain-08',
        timestamp: '2026-07-24T03:31:00Z',
        type: 'escalation',
        summary:
          'Forensics confirmed active intrusion — routed to Detection Watch for rule-gap analysis',
        actor: 'system-security-watch-deep',
      },
      {
        id: 'evt-chain-09',
        timestamp: '2026-07-24T03:36:00Z',
        type: 'proposal_created',
        summary:
          'Existing ruleset has no coverage for winword.exe → powershell.exe -enc — drafted new detection rule',
        actor: 'system-security-watch-detection',
      },
      {
        id: 'evt-chain-esc',
        timestamp: '2026-07-24T03:42:00Z',
        type: 'escalation',
        summary: 'Escalated — requires analyst decision',
        actor: 'system-security-watch-detection',
      },
    ],
  },
];

export function getRealInvestigationById(id: string) {
  return realInvestigations.find((inv) => inv.id === id) ?? null;
}

export function getRealProposalById(investigationId: string, proposalId: string) {
  return realProposals[investigationId]?.find((proposal) => proposal.id === proposalId) ?? null;
}

export const realProposals: Record<string, ListInvestigationProposalsResponse['proposals']> = {
  'inv-dark-chrysalis-001': [
    {
      id: 'prop-escalate-deep-001',
      template_id: 'proposal' as const,
      template_version: TEMPLATE_VERSION_CURRENT,
      parentConversationId: 'inv-dark-chrysalis-001',
      type: 'escalate',
      confidence: 0.94,
      reasoning:
        'IoC hash match combined with active C2 beaconing (30s interval) indicates confirmed compromise. Endpoint is actively communicating with known Chrysalis infrastructure. Immediate escalation to Deep Watch for forensic memory analysis and lateral movement assessment.',
      evidenceRefs: [
        {
          id: 'ev-001',
          type: 'alert',
          label: 'Process IoC match: svchost_update.exe',
          url: '/app/security/alerts',
        },
        {
          id: 'ev-002',
          type: 'network',
          label: 'C2 beacon: 185.220.101.47:443',
          url: '/app/security/network',
        },
      ],
      status: 'pending' as const,
      assignee: null,
      sla: '2026-07-23T01:00:00Z',
      events: [],
      sourceWatchId: 'system-security-watch-dark',
      approvalRequired: true,
      summary: 'Escalate to Deep Watch for forensic analysis',
      recommendation:
        'IoC hash match combined with active C2 beaconing (30s interval) indicates confirmed compromise. Immediate escalation to Deep Watch for forensic memory analysis and lateral movement assessment.',
    },
  ],
  'inv-dark-credential-dump-002': [
    {
      id: 'prop-contain-isolate-001',
      template_id: 'proposal' as const,
      template_version: TEMPLATE_VERSION_CURRENT,
      parentConversationId: 'inv-dark-credential-dump-002',
      type: 'contain',
      confidence: 0.88,
      reasoning:
        'Credential dumping tool detected accessing LSASS memory. Risk of lateral movement via stolen credentials. Recommend immediate network isolation of endpoint-lab-vm to prevent credential-based propagation while Deep Watch performs forensic verification.',
      evidenceRefs: [
        {
          id: 'ev-003',
          type: 'alert',
          label: 'LSASS memory access: lsass_reader.exe',
          url: '/app/security/alerts',
        },
        {
          id: 'ev-004',
          type: 'process',
          label: 'Memory dump file creation detected',
          url: '/app/security/processes',
        },
      ],
      status: 'pending' as const,
      assignee: null,
      sla: '2026-07-23T01:00:00Z',
      events: [],
      sourceWatchId: 'system-security-watch-dark',
      approvalRequired: true,
      summary: 'Contain: isolate endpoint-lab-vm',
      recommendation:
        'Credential dumping tool detected accessing LSASS memory. Recommend immediate network isolation of endpoint-lab-vm to prevent credential-based propagation while Deep Watch performs forensic verification.',
    },
  ],
  'inv-floor-chain-100': [
    {
      id: 'prop-chain-100',
      template_id: 'proposal' as const,
      template_version: TEMPLATE_VERSION_CURRENT,
      parentConversationId: 'inv-floor-chain-100',
      type: 'create',
      confidence: 0.91,
      reasoning:
        "Deep Watch's forensic confirmation (reflective DLL injection, SMB lateral-movement staging toward FIN-DC-01) traces back to a decoded PowerShell stager the existing ruleset does not cover. Detection Watch drafted a new rule matching the winword.exe -> powershell.exe -enc parent/child pattern with base64-decode entropy scoring, closing the gap this chain exposed.",
      evidenceRefs: [
        {
          id: 'ev-chain-0',
          type: 'process_event',
          label: 'winword.exe spawned powershell.exe -enc (FIN-WS-07)',
        },
        {
          id: 'ev-chain-1',
          type: 'alert',
          label: 'IoC match: Cobalt Strike stager hash',
        },
        {
          id: 'ev-chain-2',
          type: 'network',
          label: 'C2 beacon to 91.219.237.14:443',
        },
        {
          id: 'ev-chain-3',
          type: 'process_event',
          label: 'Reflective DLL injection into explorer.exe',
        },
      ],
      status: 'pending' as const,
      assignee: null,
      sla: '2026-07-24T05:00:00Z',
      events: [],
      sourceWatchId: 'system-security-watch-detection',
      approvalRequired: true,
      summary:
        'Create: new detection rule for winword.exe -> powershell.exe -enc parent/child pattern',
      recommendation:
        'Create a detection rule matching Office-application-spawns-encoded-PowerShell with base64 decode-entropy scoring, closing the gap this Cobalt Strike chain exposed.',
    },
  ],
};
