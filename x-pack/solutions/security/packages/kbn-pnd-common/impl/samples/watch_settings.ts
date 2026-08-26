/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Per-watch settings defaults, seeded into the server store.
 *
 * Every string here is an id the UI resolves to copy — no user-facing prose lives in this file.
 * Optional sections are simply absent when a watch does not offer them, which is what makes each
 * watch render a different set of sections (compare Watch Floor, which has Triggers with the Attack
 * Discovery callout, against Detection Watch, which has neither).
 *
 * `timeSecondsAgo` on ledger entries is seed-only — see the note in `catalog.ts`.
 */

import {
  SYSTEM_SECURITY_WATCH_DARK_ID,
  SYSTEM_SECURITY_WATCH_DEEP_ID,
  SYSTEM_SECURITY_WATCH_DETECTION_ID,
  SYSTEM_SECURITY_WATCH_FLOOR_ID,
  SYSTEM_SECURITY_WATCH_OFFICER_ID,
} from '../../constants';
import type { WatchLedgerEntry, WatchSettings } from '../schemas/components/watch_settings.gen';

/** Ledger row before the store stamps `time`. */
export type WatchLedgerEntrySeed = Omit<WatchLedgerEntry, 'time'> & { timeSecondsAgo: number };

/** Per-watch settings before the store stamps ledger timestamps. */
export type WatchSettingsSeed = Omit<WatchSettings, 'runsLedger'> & {
  runsLedger?: WatchLedgerEntrySeed[];
};

const MINUTE = 60;
const HOUR = 60 * MINUTE;

const SCHEDULE_OPTION_IDS = ['every-5m', 'every-15m', 'every-30m', 'hourly'];

const DATA_SOURCE_OPTION_IDS = [
  'alerts-only',
  'alerts-entities',
  'alerts-entities-timelines',
  'alerts-entities-timelines-edr',
];

const ASSIGNEE_QUEUE_OPTION_IDS = [
  'unassigned',
  'tier-1-alert-triage',
  'tier-2-escalations',
  'detection-engineering',
  'threat-hunting',
];

const ESCALATION_CONTACT_OPTION_IDS = ['none', 'soc-lead-on-call', 'ir-on-call', 'detection-lead'];

const RESPONSE_APPROVER_ROLE_IDS = ['incident-lead', 'soc-lead', 'threat-hunter'];
const DETECTION_APPROVER_ROLE_IDS = ['detection-engineer', 'soc-lead'];
const HUNT_APPROVER_ROLE_IDS = ['threat-hunter', 'soc-lead', 'incident-lead'];

/** Host isolation always gates — a consequential action stays locked at any autonomy level. */
const HOST_ISOLATION_GATE: WatchSettings['approvalGates'] = [
  {
    id: 'host-isolation',
    requirement: 'always',
    requirementLocked: true,
    approverRoleId: 'incident-lead',
    approverRoleOptionIds: RESPONSE_APPROVER_ROLE_IDS,
  },
];

/** Evidence-only work has no side effects, so it needs no approver. */
const EVIDENCE_ONLY_GATE: WatchSettings['approvalGates'] = [
  {
    id: 'evidence-only-investigation',
    requirement: 'in-scope',
    requirementLocked: true,
    approverRoleId: null,
  },
];

const HUNT_EXECUTION_GATE: WatchSettings['approvalGates'] = [
  {
    id: 'hunt-execution',
    requirement: 'high-impact',
    requirementLocked: false,
    approverRoleId: 'threat-hunter',
    approverRoleOptionIds: HUNT_APPROVER_ROLE_IDS,
  },
];

const floorSettings: WatchSettingsSeed = {
  watchId: SYSTEM_SECURITY_WATCH_FLOOR_ID,
  autonomy: 'manual',
  general: { runAsIdentity: 'svc-watch-floor', showMvpScopeWarning: true },
  triggers: {
    sharedWithAttackDiscovery: true,
    schedule: { optionIds: SCHEDULE_OPTION_IDS, selectedId: 'every-15m' },
    allowManualRun: true,
  },
  scopeRouting: {
    dataSources: {
      optionIds: DATA_SOURCE_OPTION_IDS,
      selectedId: 'alerts-entities-timelines',
    },
    assigneeQueue: {
      optionIds: ASSIGNEE_QUEUE_OPTION_IDS,
      selectedId: 'tier-1-alert-triage',
    },
    escalationContact: {
      optionIds: ESCALATION_CONTACT_OPTION_IDS,
      selectedId: 'soc-lead-on-call',
    },
  },
  workers: [
    { workerId: 'threat-intel-enrichment', enabled: true },
    { workerId: 'alert-correlation', enabled: true },
    { workerId: 'host-context', enabled: true },
    { workerId: 'attack-discovery-continuation', enabled: true },
  ],
  skills: [
    { skillId: 'alert-triage', enabled: true },
    { skillId: 'mitre-attack-mapping', enabled: true },
    { skillId: 'dark-web-feeds', enabled: true },
    // Attached and on per-watch, but globally off while unavailable — effective state is off.
    { skillId: 'virustotal-lookup', enabled: true },
  ],
  approvalGates: [...HOST_ISOLATION_GATE, ...HUNT_EXECUTION_GATE, ...EVIDENCE_ONLY_GATE],
  runsLedger: [
    {
      id: 'ledger-floor-1',
      timeSecondsAgo: 4 * MINUTE,
      callableId: 'alert-triage',
      action: 'draft',
      event: 'Drafted a case — mailbox rules are good',
      outcome: 'awaiting-review',
    },
    {
      id: 'ledger-floor-2',
      timeSecondsAgo: 26 * MINUTE,
      callableId: 'alert-correlation',
      action: 'read',
      event: 'Grouped 6 alerts into one proposed finding',
      outcome: 'accepted',
    },
    {
      id: 'ledger-floor-3',
      timeSecondsAgo: 1 * HOUR + 12 * MINUTE,
      callableId: 'threat-intel-enrichment',
      action: 'read',
      event: 'Enriched 14 alerts with external intel context',
      outcome: 'completed',
    },
    {
      id: 'ledger-floor-4',
      timeSecondsAgo: 3 * HOUR,
      callableId: 'alert-triage',
      action: 'draft',
      event: 'Suppression proposed — noisy scanner in staging',
      outcome: 'dismissed',
    },
  ],
};

const officerSettings: WatchSettingsSeed = {
  watchId: SYSTEM_SECURITY_WATCH_OFFICER_ID,
  autonomy: 'manual',
  general: { runAsIdentity: 'svc-watch-officer', showMvpScopeWarning: false },
  // No Triggers section — the Officer runs off Floor hand-offs, not its own schedule.
  scopeRouting: {
    dataSources: { optionIds: DATA_SOURCE_OPTION_IDS, selectedId: 'alerts-entities' },
    assigneeQueue: { optionIds: ASSIGNEE_QUEUE_OPTION_IDS, selectedId: 'tier-2-escalations' },
    escalationContact: { optionIds: ESCALATION_CONTACT_OPTION_IDS, selectedId: 'ir-on-call' },
  },
  workers: [
    { workerId: 'threat-intel-enrichment', enabled: true },
    { workerId: 'alert-correlation', enabled: true },
    { workerId: 'case-assembly', enabled: true },
  ],
  skills: [
    { skillId: 'case-assembly', enabled: true },
    { skillId: 'escalation', enabled: true },
  ],
  approvalGates: [...HOST_ISOLATION_GATE, ...EVIDENCE_ONLY_GATE],
  runsLedger: [
    {
      id: 'ledger-officer-1',
      timeSecondsAgo: 12 * MINUTE,
      callableId: 'case-assembly',
      action: 'gated',
      event: 'Case staged for review — 3 linked alerts',
      outcome: 'awaiting-review',
    },
    {
      id: 'ledger-officer-2',
      timeSecondsAgo: 3 * HOUR,
      callableId: 'escalation',
      action: 'gated',
      event: 'Paged on-call — credential access on a finance host',
      outcome: 'executed',
    },
  ],
};

const darkSettings: WatchSettingsSeed = {
  watchId: SYSTEM_SECURITY_WATCH_DARK_ID,
  autonomy: 'manual',
  general: { runAsIdentity: 'svc-watch-dark', showMvpScopeWarning: false },
  triggers: {
    // Dark Watch owns its own sweep schedule — nothing shared with Attack Discovery here.
    sharedWithAttackDiscovery: false,
    schedule: { optionIds: SCHEDULE_OPTION_IDS, selectedId: 'hourly' },
    allowManualRun: true,
  },
  scopeRouting: {
    dataSources: { optionIds: DATA_SOURCE_OPTION_IDS, selectedId: 'alerts-entities-timelines-edr' },
    assigneeQueue: { optionIds: ASSIGNEE_QUEUE_OPTION_IDS, selectedId: 'threat-hunting' },
    escalationContact: { optionIds: ESCALATION_CONTACT_OPTION_IDS, selectedId: 'soc-lead-on-call' },
  },
  workers: [
    { workerId: 'threat-intel-enrichment', enabled: true },
    { workerId: 'attack-discovery-continuation', enabled: true },
    { workerId: 'containment', enabled: true },
  ],
  skills: [
    { skillId: 'alert-triage', enabled: true },
    { skillId: 'containment', enabled: true },
  ],
  approvalGates: [...HOST_ISOLATION_GATE, ...HUNT_EXECUTION_GATE],
  runsLedger: [
    {
      id: 'ledger-dark-1',
      timeSecondsAgo: 31 * MINUTE,
      callableId: 'containment',
      action: 'gated',
      event: 'Isolation proposed — beacon traffic from two hosts',
      outcome: 'awaiting-review',
    },
    {
      id: 'ledger-dark-2',
      timeSecondsAgo: 2 * HOUR,
      callableId: 'alert-triage',
      action: 'read',
      event: 'Overnight sweep clean — no new coverage gaps',
      outcome: 'completed',
    },
  ],
};

const deepSettings: WatchSettingsSeed = {
  watchId: SYSTEM_SECURITY_WATCH_DEEP_ID,
  autonomy: 'manual',
  general: { runAsIdentity: 'svc-watch-deep', showMvpScopeWarning: false },
  // No Triggers section — Deep Watch is specialist and on-demand only.
  scopeRouting: {
    dataSources: { optionIds: DATA_SOURCE_OPTION_IDS, selectedId: 'alerts-entities-timelines-edr' },
    assigneeQueue: { optionIds: ASSIGNEE_QUEUE_OPTION_IDS, selectedId: 'threat-hunting' },
    escalationContact: { optionIds: ESCALATION_CONTACT_OPTION_IDS, selectedId: 'none' },
  },
  workers: [
    { workerId: 'threat-intel-enrichment', enabled: true },
    { workerId: 'host-context', enabled: true },
    { workerId: 'attack-discovery-continuation', enabled: true },
  ],
  skills: [{ skillId: 'mitre-attack-mapping', enabled: true }],
  // Draft-only by mandate, so the evidence gate is the only one that applies.
  approvalGates: [...EVIDENCE_ONLY_GATE],
  runsLedger: [
    {
      id: 'ledger-deep-1',
      timeSecondsAgo: 5 * HOUR,
      callableId: 'mitre-attack-mapping',
      action: 'draft',
      event: 'Forensic timeline drafted — 3 techniques mapped',
      outcome: 'awaiting-review',
    },
  ],
};

const detectionSettings: WatchSettingsSeed = {
  watchId: SYSTEM_SECURITY_WATCH_DETECTION_ID,
  // Invented value — #18718 gives the three levels but explicitly leaves the mapping from the old
  // numeric scale open, so no other watch asserts anything beyond the Manual default.
  autonomy: 'assisted',
  general: { runAsIdentity: 'svc-watch-detection', showMvpScopeWarning: false },
  triggers: {
    sharedWithAttackDiscovery: false,
    schedule: { optionIds: SCHEDULE_OPTION_IDS, selectedId: 'hourly' },
    allowManualRun: true,
  },
  scopeRouting: {
    dataSources: { optionIds: DATA_SOURCE_OPTION_IDS, selectedId: 'alerts-only' },
    assigneeQueue: { optionIds: ASSIGNEE_QUEUE_OPTION_IDS, selectedId: 'detection-engineering' },
    escalationContact: { optionIds: ESCALATION_CONTACT_OPTION_IDS, selectedId: 'detection-lead' },
  },
  workers: [
    { workerId: 'rule-tuning', enabled: true },
    { workerId: 'rule-creation', enabled: true },
    { workerId: 'prebuilt-rule-onboarding', enabled: true },
  ],
  skills: [
    { skillId: 'mitre-attack-mapping', enabled: true },
    { skillId: 'rule-preview', enabled: true },
  ],
  approvalGates: [
    {
      id: 'detection-rule-change',
      requirement: 'always',
      requirementLocked: true,
      approverRoleId: 'detection-engineer',
      approverRoleOptionIds: DETECTION_APPROVER_ROLE_IDS,
    },
    {
      id: 'new-detection-rule',
      requirement: 'always',
      requirementLocked: true,
      approverRoleId: 'detection-engineer',
      approverRoleOptionIds: DETECTION_APPROVER_ROLE_IDS,
    },
    ...HUNT_EXECUTION_GATE,
  ],
  runsLedger: [
    {
      id: 'ledger-detection-1',
      timeSecondsAgo: 22 * MINUTE,
      callableId: 'rule-tuning',
      action: 'draft',
      event: 'Exception proposed — service account triggers admin-login rule',
      outcome: 'awaiting-review',
    },
    {
      id: 'ledger-detection-2',
      timeSecondsAgo: 1 * HOUR,
      callableId: 'rule-creation',
      action: 'draft',
      event: 'New ES|QL rule drafted for an uncovered persistence technique',
      outcome: 'awaiting-review',
    },
    {
      id: 'ledger-detection-3',
      timeSecondsAgo: 4 * HOUR,
      callableId: 'rule-preview',
      action: 'read',
      event: 'Backtested a rule update — 2 fewer false positives per day',
      outcome: 'completed',
    },
  ],
};

export const WATCH_SETTINGS_SEED: Record<string, WatchSettingsSeed> = {
  [SYSTEM_SECURITY_WATCH_FLOOR_ID]: floorSettings,
  [SYSTEM_SECURITY_WATCH_OFFICER_ID]: officerSettings,
  [SYSTEM_SECURITY_WATCH_DARK_ID]: darkSettings,
  [SYSTEM_SECURITY_WATCH_DEEP_ID]: deepSettings,
  [SYSTEM_SECURITY_WATCH_DETECTION_ID]: detectionSettings,
};
