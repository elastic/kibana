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
 * `timeSecondsAgo` on ledger entries is seed-only — see the note in `skills.ts`.
 *
 * There is deliberately no `workers` attachment array: a worker is a read-only projection of an
 * `ai.agent` step of the watch's lane (kibana-phf4.6), and it already carries the watches whose lane
 * declares it, so a second, writable copy of that fact here could only disagree with the lane.
 *
 * There is deliberately no `approvalGates` array either (kibana-phf4.33). The 2026-08-10 design
 * deleted the Approval gates section, which was the only surface that rendered these rows, and the
 * five ids seeded here were fictional and disjoint from PND's four real gate ids anyway — the honest
 * complaint register `#40` recorded. The field survives on `WatchSettings` because it is #284009's
 * schema; nothing populates it, and the PATCH route refuses to write it.
 */

import {
  SYSTEM_SECURITY_WATCH_DARK_ID,
  SYSTEM_SECURITY_WATCH_DEEP_ID,
  SYSTEM_SECURITY_WATCH_POST_INCIDENT_ID,
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
  skills: [
    { skillId: 'alert-triage', enabled: true },
    { skillId: 'mitre-attack-mapping', enabled: true },
    { skillId: 'dark-web-feeds', enabled: true },
    // Attached and on per-watch, but globally off while unavailable — effective state is off.
    { skillId: 'virustotal-lookup', enabled: true },
  ],
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
      // The Floor's own `open_investigation` step, which is what a worker is now (kibana-phf4.6).
      callableId: 'open_investigation',
      action: 'read',
      event: 'Grouped 6 alerts into one proposed finding',
      outcome: 'accepted',
    },
    {
      id: 'ledger-floor-3',
      timeSecondsAgo: 1 * HOUR + 12 * MINUTE,
      callableId: 'dark-web-feeds',
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
  skills: [
    { skillId: 'case-assembly', enabled: true },
    { skillId: 'escalation', enabled: true },
  ],
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
  skills: [
    { skillId: 'alert-triage', enabled: true },
    { skillId: 'containment', enabled: true },
  ],
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
  skills: [{ skillId: 'mitre-attack-mapping', enabled: true }],
  // Draft-only by mandate, so the evidence gate is the only one that applies.
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
  watchId: SYSTEM_SECURITY_WATCH_POST_INCIDENT_ID,
  // Invented value — #18718 gives the three levels but explicitly leaves the mapping from the old
  // numeric scale open, so no other watch asserts anything beyond the Manual default.
  autonomy: 'assisted',
  general: { runAsIdentity: 'svc-watch-post-incident', showMvpScopeWarning: false },
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
  skills: [
    { skillId: 'mitre-attack-mapping', enabled: true },
    { skillId: 'rule-preview', enabled: true },
  ],
  runsLedger: [
    {
      id: 'ledger-detection-1',
      timeSecondsAgo: 22 * MINUTE,
      // The watch's own `draft_tuning` step (kibana-phf4.6). The prose describes a query change
      // rather than an exception because that is what the step drafts since kibana-phf4.11, and the
      // tuning agent is instructed never to propose suppression.
      callableId: 'draft_tuning',
      action: 'draft',
      event: 'Query change drafted — service account excluded from the admin-login rule',
      outcome: 'awaiting-review',
    },
    {
      // There is deliberately no rule-creation row: drafting a new rule is not part of the
      // post-incident watch, so a ledger row for it described a run that could never happen.
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
  [SYSTEM_SECURITY_WATCH_POST_INCIDENT_ID]: detectionSettings,
};
