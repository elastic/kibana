/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Mock anomaly → MITRE tactic mapping for both v.2 prototypes. Each ML job
 * referenced from `behavioral_anomalies_v2/mock_tab_data.ts` gets a small
 * tactics tuple (1 entry in most cases, 2–3 for a couple of jobs) so the
 * "All anomalies aggregated" view shows a believable distribution.
 *
 * Cleanup: deleted together with the rest of the `mitre/` folder.
 */

import { MITRE_TACTIC_NAMES } from './tactics';

/** Mapping: ML job id (from `mock_tab_data.ts`) → MITRE tactic names triggered. */
export const MOCK_JOB_TO_TACTICS: Record<string, readonly string[]> = {
  auth_high_count_logon: ['Credential Access'],
  suspicious_login_after_hours: ['Initial Access', 'Credential Access'],
  rare_destination_country: ['Initial Access'],
  unusual_process_execution: ['Execution', 'Defense Impairment'],
  high_source_ip_count: ['Reconnaissance'],
  rare_user_agent: ['Reconnaissance'],
  dns_tunneling_score: ['Command and Control', 'Exfiltration'],
  privilege_escalation_host: ['Privilege Escalation'],
  data_exfil_volume: ['Exfiltration', 'Collection'],
  lateral_movement_score: ['Lateral Movement'],
  oauth_token_anomaly: ['Persistence', 'Credential Access'],
  cloud_api_call_rate: ['Discovery'],
};

/**
 * Returns the subset of MITRE tactics triggered by the provided ML job ids.
 * Preserves the canonical kill-chain order so the chain visualization keeps
 * a stable left-to-right reading.
 */
export const getTriggeredTacticsForJobs = (jobIds: readonly string[]): string[] => {
  const triggered = new Set<string>();
  for (const jobId of jobIds) {
    const tactics = MOCK_JOB_TO_TACTICS[jobId];
    if (!tactics) continue;
    for (const tactic of tactics) triggered.add(tactic);
  }
  return MITRE_TACTIC_NAMES.filter((name) => triggered.has(name));
};

/** Tactics shown as "triggered" in the right-panel v.2 overview ("5 Tactics"). */
export const MOCK_TRIGGERED_TACTICS_V2: readonly string[] = getTriggeredTacticsForJobs([
  'auth_high_count_logon',
  'rare_destination_country',
  'privilege_escalation_host',
  'lateral_movement_score',
  'dns_tunneling_score',
]);

/**
 * Per-tactic anomaly counts shown in the right-panel v.2 chain tooltips.
 * Sum across all triggered tactics is roughly `MOCK_ANOMALY_V2_TOTAL_COUNT`
 * so the breakdown reads consistently with the "<N> Anomalies" stat next to
 * the swim lane. Non-triggered tactics return 0; the tooltip still renders so
 * every dot is hoverable.
 */
export const MOCK_ANOMALY_COUNT_BY_TACTIC_V2: Readonly<Record<string, number>> = {
  Reconnaissance: 0,
  'Resource Development': 0,
  'Initial Access': 25,
  Execution: 0,
  Persistence: 0,
  'Privilege Escalation': 18,
  Stealth: 0,
  'Defense Impairment': 0,
  'Credential Access': 38,
  Discovery: 0,
  'Lateral Movement': 12,
  Collection: 0,
  'Command and Control': 27,
  Exfiltration: 22,
  Impact: 0,
};
