/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Namespaced tool IDs for the deep-watch-forensics skill.
 *
 * These MUST stay in sync with the server-side definitions in
 * `security_solution/server/agent_builder/skills/deep_watch_forensics/`.
 */
export const DEEP_WATCH_TOOL_IDS = {
  package_evidence: 'security.deep_watch.package_evidence',
  produce_draft_forensic_report: 'security.deep_watch.produce_draft_forensic_report',
} as const;

/** Well-known endpoint telemetry index patterns scoped by Deep Watch. */
export const DEEP_WATCH_INDICES = {
  process: 'logs-endpoint.events.process-*',
  network: 'logs-endpoint.events.network-*',
  file: 'logs-endpoint.events.file-*',
  registry: 'logs-endpoint.events.registry-*',
} as const;

/** Skill ID used in routing assertions and Watch callables. */
export const DEEP_WATCH_FORENSICS_SKILL_ID = 'deep-watch-forensics';

/**
 * The Agent Builder namespace prefix for deep-watch-forensics tools.
 * The converse API emits tool calls as `security.deep_watch.*`, not
 * `deep-watch-forensics.*`, so routing assertions must check both forms.
 */
export const DEEP_WATCH_TOOL_NAMESPACE = 'security.deep_watch';

/** Index where the produce_draft_forensic_report tool persists its reports. */
export const DEEP_WATCH_FORENSICS_REPORTS_INDEX = '.kibana-deep-watch-forensics-reports';

/** Default escalation context used in Deep Watch flow and composite pipeline tests. */
export const DEFAULT_ESCALATION_CONTEXT = {
  alert_id: 'alert-apt29-lateral',
  alert_name: 'APT29 Lateral Movement Detected',
  severity: 'critical',
  host_name: 'DESKTOP-APT29',
  host_os: 'windows',
  source_ip: '10.0.1.15',
  timestamp: '2025-07-20T14:32:00Z',
  alert_description: 'Suspicious service creation and registry persistence detected on endpoint.',
  rule_name: 'APT29 Lateral Movement — Service Creation',
  category: 'Lateral Movement',
  mitre_tactic: ['TA0008'],
  mitre_technique: ['T1021.002', 'T1543.003'],
} as const;

/** Seeded alert index pattern scoped by composite pipeline specs. */
export const SEEDED_ALERT_INDEX = 'logs-endpoint.events.process-*';

/** Known alert entity ID present in seeded telemetry (for draft validation). */
export const KNOWN_ALERT_ID = 'alert-apt29-lateral';

/** Default Elastic AI Agent ID used for Agent Builder evals. */
export const agentBuilderDefaultAgentId = 'elastic-ai-agent';

/**
 * PND (Project Not-Daybreak) Investigation object-model surface exercised by
 * Family D orchestrator-identity gates D3/D6. These MUST stay in sync with
 * `x-pack/solutions/security/plugins/pnd/server/routes/investigations/`.
 */
export const PND_EMIT_PROPOSAL_PATH = '/internal/pnd/investigations/_emit_proposal';
export const PND_API_VERSION = '1';
export const PND_INVESTIGATIONS_INDEX = 'pnd-investigations';
export const PND_CANONICAL_PROPOSALS_INDEX = 'pnd-canonical-proposals';
