/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** The kinds of data an alert-recovery round can read. */
export interface EvidenceFamily {
  id: string;
  /** What reaching it means, shown to the judge. */
  description: string;
}

export const EVIDENCE_FAMILIES: readonly EvidenceFamily[] = [
  {
    id: 'alert_documents',
    description: 'Alert documents: the alert indices (`.alerts-*`) or an alert API.',
  },
  {
    id: 'rule_event_log',
    description: 'The rule execution record: the Kibana event log (`.kibana-event-log-*`).',
  },
  {
    id: 'apm_metrics',
    description:
      'APM transaction or service metrics indices, such as `metrics-apm*` or 1-minute transaction metrics.',
  },
  {
    id: 'apm_traces_errors',
    description: 'APM traces and error documents, such as `traces-apm*` or `logs-apm.error*`.',
  },
  {
    id: 'service_logs',
    description: 'Application and deployment log indices, such as `logs-*` or `logging-*:logs-*`.',
  },
  {
    id: 'remote_clusters',
    description: 'Any cluster other than the local one, queried with `<cluster>:<index>` patterns.',
  },
  {
    id: 'chat_or_incident_records',
    description: 'Chat threads or incident and ticket records, such as the Slack read tools.',
  },
  {
    id: 'source_code',
    description: 'Source repositories: GitHub reads, `git clone`, `git grep` or `git ls-tree`.',
  },
  {
    id: 'prior_memory',
    description:
      "The agent's memory or wiki files, such as `/workspace/memories` or `/workspace/wiki`.",
  },
];

export const EVIDENCE_FAMILY_IDS: readonly string[] = EVIDENCE_FAMILIES.map(({ id }) => id);
