/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

/**
 * Evidence indices the hunt agent must interrogate directly. The entity store
 * (`.entities.v2.latest.*`) is deliberately excluded from this list: it only
 * carries derived context (risk, criticality, first/last seen) and must never
 * be treated as the source of the behavioral evidence a hunt reports on.
 */
export const HUNT_EVIDENCE_INDICES = ['.alerts-security.alerts-*', 'logs-*'] as const;

/**
 * Prepended to every AI Hunt request (templated and free-text). This steers the
 * agent to base findings on real evidence — detection alerts and raw events —
 * rather than summarizing entity-store maintainer records. The instructions are
 * plain English (not a rigid schema) so the agent keeps the freedom to pick the
 * right ES|QL/search tool, while the intent is unambiguous.
 *
 * Not translated: this is model-facing system guidance, not user-visible UI
 * copy, and the downstream agent reasons in English.
 */
export const HUNT_SCOPE_INSTRUCTIONS = [
  'You are a threat-hunting assistant for a security analyst. Investigate the request below using real evidence.',
  '',
  'Where to look (in priority order):',
  '1. Detection alerts in `.alerts-security.alerts-*` — detection evidence of potentially suspicious activity; an alert does not establish a confirmed attack.',
  '2. Raw events in `logs-*` (process, network, authentication, file events) — corroborating and pre-alert evidence.',
  'Query these indices for the relevant entities (host.name, user.name, service.name) over the requested time range using your ES|QL and search tools.',
  '',
  'How to use the entity store:',
  '- The entity store (`.entities.v2.latest.*`) holds only derived CONTEXT: risk score, criticality, and first/last seen.',
  '- Use it to enrich or prioritize entities you already found in the alerts and logs. Never treat entity-store documents as the evidence itself, and do not report "findings" that exist only in the entity store.',
  '',
  'How to summarize:',
  '- Ground every finding in alerts or raw events. Include counts, timestamps (earliest/latest), the detection rule names involved, affected host.name / user.name, and MITRE ATT&CK techniques when the data carries them (`kibana.alert.rule.threat.technique.*`, `threat.technique.*`).',
  '- If the alerts and logs contain no supporting evidence for the request, say so plainly instead of inferring activity from context alone.',
  '',
  'Rich artifacts (optional, strongly encouraged when they aid comprehension):',
  'After your prose answer, you MAY emit a single fenced code block labelled `hunt-artifacts` containing a JSON array of artifact directives. Each directive names a visual to render and WHICH REAL ENTITY/FIELD to ground it in — never any numbers. The UI computes every value from the real query results and silently drops any artifact it cannot ground, so only reference entities/fields that actually appear in your evidence.',
  'Directive shape: {"type": <one of entity_card|alert_table|risk_gauge|mitre_strip|attack_path|sankey|metric_row>, "title"?: string, "entity"?: "<exact user.name/host.name/service.name from the evidence>", "field"?: "<ES field, e.g. source.ip>", "toField"?: "<ES field, e.g. destination.ip>"}.',
  'Guidance: use entity_card / risk_gauge for a specific implicated user or host; alert_table for the alerts you cite; mitre_strip when techniques are present; attack_path for a multi-step chain on one entity; sankey for source→destination or entity→technique flows (set field/toField); metric_row for an at-a-glance count summary. Emit 2-5 artifacts that best illustrate THIS hunt. Do NOT fabricate — if you did not observe supporting rows, do not emit the artifact.',
  'Example: ```hunt-artifacts\n[{"type":"entity_card","entity":"svc-backup"},{"type":"alert_table","title":"Credential-access alerts","entity":"svc-backup"},{"type":"mitre_strip"}]\n```',
] as const;

/**
 * Wraps a user or template hunt prompt with the scope instructions so both the
 * free-text composer and the guided templates hunt against evidence indices.
 */
export const buildHuntPrompt = (request: string): string =>
  [...HUNT_SCOPE_INSTRUCTIONS, '', 'Hunt request:', request.trim()].join('\n');

export interface HuntTemplate {
  id: string;
  icon: string;
  title: string;
  description: string;
  /** Short "Uses:" chip describing the evidence the hunt interrogates. */
  uses: string;
  /**
   * Human-readable intent shown to the analyst (transcript + hunt question).
   * Free of index names and field engineering.
   */
  intent: string;
  /**
   * Engineered request that names the concrete evidence indices/fields. Sent to
   * the agent (after scope wrapping) but never surfaced raw to the analyst.
   */
  request: string;
}

export interface HuntSubmission {
  /** Readable text shown in the transcript and the hunt question. */
  displayText: string;
  /** Fully scoped prompt sent to the agent. */
  scopedPrompt: string;
}

/**
 * Resolves what the analyst sees versus what the agent receives for a hunt.
 *
 * Free-text questions read the same both ways. Guided templates keep the
 * engineered index/field text (`request`) out of the analyst's view — the
 * readable `intent` is displayed while the scoped `request` is sent — so the
 * `.alerts-security.alerts-*` plumbing never becomes front-and-center noise.
 */
export const resolveHuntSubmission = (
  question: string,
  template?: Pick<HuntTemplate, 'intent' | 'request'>
): HuntSubmission => {
  const trimmed = question.trim();
  if (template) {
    return {
      displayText: template.intent,
      scopedPrompt: buildHuntPrompt(template.request),
    };
  }
  return {
    displayText: trimmed,
    scopedPrompt: buildHuntPrompt(trimmed),
  };
};

const USES_ALERTS_EVENTS = i18n.translate(
  'xpack.securitySolution.entityAnalytics.intelligence.aiHunt.usesAlertsEvents',
  { defaultMessage: 'Uses: alerts + raw events' }
);

const USES_AUTH_EVENTS = i18n.translate(
  'xpack.securitySolution.entityAnalytics.intelligence.aiHunt.usesAuthEvents',
  { defaultMessage: 'Uses: authentication events + alerts' }
);

const USES_PROCESS_EVENTS = i18n.translate(
  'xpack.securitySolution.entityAnalytics.intelligence.aiHunt.usesProcessEvents',
  { defaultMessage: 'Uses: process events + alerts' }
);

/**
 * Guided hunt templates. Each `request` names the concrete evidence indices and
 * fields so the agent queries alerts/logs for the behavior rather than reading
 * entity-store summaries.
 */
export const HUNT_TEMPLATES: HuntTemplate[] = [
  {
    id: 'lateral_movement',
    icon: 'merge',
    title: i18n.translate(
      'xpack.securitySolution.entityAnalytics.intelligence.aiHunt.templates.lateralMovement',
      { defaultMessage: 'Lateral movement' }
    ),
    description: i18n.translate(
      'xpack.securitySolution.entityAnalytics.intelligence.aiHunt.templates.lateralMovementDesc',
      { defaultMessage: 'Users reaching hosts they never touch, odd RDP/SSH.' }
    ),
    uses: USES_AUTH_EVENTS,
    intent: i18n.translate(
      'xpack.securitySolution.entityAnalytics.intelligence.aiHunt.templates.lateralMovementIntent',
      { defaultMessage: 'Find lateral movement across hosts in the last 7 days.' }
    ),
    request:
      'Hunt for lateral movement in the last 7 days. Query `.alerts-security.alerts-*` for lateral-movement / remote-access detection alerts, then corroborate with authentication and process events in `logs-*` (RDP/SSH sessions, remote service creation, credential reuse across hosts). Report which user.name authenticated to which host.name, the source and destination, event counts, first/last timestamps, the rule names, and MITRE techniques (e.g. T1021).',
  },
  {
    id: 'credential_access',
    icon: 'key',
    title: i18n.translate(
      'xpack.securitySolution.entityAnalytics.intelligence.aiHunt.templates.credentialAccess',
      { defaultMessage: 'Credential access' }
    ),
    description: i18n.translate(
      'xpack.securitySolution.entityAnalytics.intelligence.aiHunt.templates.credentialAccessDesc',
      { defaultMessage: 'Credential dumping, LSASS access, secret theft.' }
    ),
    uses: USES_PROCESS_EVENTS,
    intent: i18n.translate(
      'xpack.securitySolution.entityAnalytics.intelligence.aiHunt.templates.credentialAccessIntent',
      { defaultMessage: 'Find credential access and dumping in the last 7 days.' }
    ),
    request:
      'Hunt for credential access and credential dumping in the last 7 days. Query `.alerts-security.alerts-*` for credential-access alerts and corroborate with process events in `logs-*` (LSASS access, mimikatz-like tooling, secret/keystore reads). Summarize affected host.name and user.name, the processes involved, event counts, timestamps, rule names, and MITRE techniques (e.g. T1003).',
  },
  {
    id: 'privilege_escalation',
    icon: 'lock',
    title: i18n.translate(
      'xpack.securitySolution.entityAnalytics.intelligence.aiHunt.templates.privilegeEscalation',
      { defaultMessage: 'Privilege escalation' }
    ),
    description: i18n.translate(
      'xpack.securitySolution.entityAnalytics.intelligence.aiHunt.templates.privilegeEscalationDesc',
      { defaultMessage: 'New admins, privileged group changes, sudo anomalies.' }
    ),
    uses: USES_ALERTS_EVENTS,
    intent: i18n.translate(
      'xpack.securitySolution.entityAnalytics.intelligence.aiHunt.templates.privilegeEscalationIntent',
      { defaultMessage: 'Find privilege escalation in the last 7 days.' }
    ),
    request:
      'Hunt for privilege escalation in the last 7 days. Query `.alerts-security.alerts-*` for privilege-escalation alerts and corroborate with events in `logs-*` (users added to privileged groups, sudo/runas anomalies, new admin accounts). Report affected user.name and host.name, event counts, timestamps, rule names, and MITRE techniques (e.g. T1068, T1078).',
  },
  {
    id: 'initial_access',
    icon: 'push',
    title: i18n.translate(
      'xpack.securitySolution.entityAnalytics.intelligence.aiHunt.templates.initialAccess',
      { defaultMessage: 'Initial access' }
    ),
    description: i18n.translate(
      'xpack.securitySolution.entityAnalytics.intelligence.aiHunt.templates.initialAccessDesc',
      { defaultMessage: 'Phishing payloads, first-touch execution on endpoints.' }
    ),
    uses: USES_ALERTS_EVENTS,
    intent: i18n.translate(
      'xpack.securitySolution.entityAnalytics.intelligence.aiHunt.templates.initialAccessIntent',
      { defaultMessage: 'Find signs of initial access in the last 7 days.' }
    ),
    request:
      'Hunt for signs of initial access in the last 7 days. Query `.alerts-security.alerts-*` for initial-access / execution alerts and corroborate with process and network events in `logs-*` (suspicious downloads, macro/script execution, first-touch payloads on endpoints). Report the affected host.name and user.name, the earliest activity, event counts, rule names, and MITRE techniques (e.g. T1566, T1204).',
  },
  {
    id: 'data_staging',
    icon: 'database',
    title: i18n.translate(
      'xpack.securitySolution.entityAnalytics.intelligence.aiHunt.templates.dataStaging',
      { defaultMessage: 'Data staging' }
    ),
    description: i18n.translate(
      'xpack.securitySolution.entityAnalytics.intelligence.aiHunt.templates.dataStagingDesc',
      { defaultMessage: 'Bulk archiving, large copies, unexpected compression.' }
    ),
    uses: USES_PROCESS_EVENTS,
    intent: i18n.translate(
      'xpack.securitySolution.entityAnalytics.intelligence.aiHunt.templates.dataStagingIntent',
      { defaultMessage: 'Find data staging in the last 7 days.' }
    ),
    request:
      'Hunt for data staging in the last 7 days. Query `.alerts-security.alerts-*` for collection/exfil alerts and corroborate with process and file events in `logs-*` (archive creation, large file copies to staging directories, unexpected compression tools). Report affected host.name and user.name, the processes/paths involved, event counts, timestamps, rule names, and MITRE techniques (e.g. T1074, T1560).',
  },
  {
    id: 'service_account_anomalies',
    icon: 'vectorTriangle',
    title: i18n.translate(
      'xpack.securitySolution.entityAnalytics.intelligence.aiHunt.templates.serviceAccounts',
      { defaultMessage: 'Service account anomalies' }
    ),
    description: i18n.translate(
      'xpack.securitySolution.entityAnalytics.intelligence.aiHunt.templates.serviceAccountsDesc',
      { defaultMessage: 'Service accounts acting like interactive humans.' }
    ),
    uses: USES_AUTH_EVENTS,
    intent: i18n.translate(
      'xpack.securitySolution.entityAnalytics.intelligence.aiHunt.templates.serviceAccountsIntent',
      { defaultMessage: 'Find service accounts behaving like interactive users.' }
    ),
    request:
      'Hunt for service accounts behaving like interactive users in the last 7 days. Query `.alerts-security.alerts-*` and authentication events in `logs-*` for service accounts (user.name matching svc*/service patterns) with interactive logons or authentication from workstations. Report the anomalous user.name, the host.name involved, event counts, timestamps, rule names, and MITRE techniques (e.g. T1078.003).',
  },
];
