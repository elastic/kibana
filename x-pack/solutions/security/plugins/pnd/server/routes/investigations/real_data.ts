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
};
