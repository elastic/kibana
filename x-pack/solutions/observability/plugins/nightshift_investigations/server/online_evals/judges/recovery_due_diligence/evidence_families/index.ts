/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RegisteredEvaluatorDefinition } from '@kbn/evals-plugin/server';
import { roundEvidenceSchema } from '../../render_round';

/** Families of evidence a round can read, each recognised from the tool-call arguments. */
export const EVIDENCE_FAMILIES: ReadonlyArray<{ id: string; pattern: RegExp }> = [
  { id: 'alert_documents', pattern: /\.alerts-|kibana\.alert\./ },
  { id: 'rule_event_log', pattern: /\.kibana-event-log|event-log|rule_execution|event\.provider/ },
  {
    id: 'apm_metrics',
    pattern: /metrics-apm|transaction\.(duration|name)|event\.success_count|\.1m/,
  },
  { id: 'apm_traces_errors', pattern: /traces-apm|logs-apm\.error|error\.exception|trace\.id/ },
  { id: 'service_logs', pattern: /logging-[a-z0-9-]*:|logs-\*|:logs-/ },
  { id: 'remote_clusters', pattern: /[/"\s=][a-z0-9-]+:(logs|metrics|traces)-/ },
  { id: 'chat_or_incident_records', pattern: /nightshift_slack|slack_read|incident/i },
  { id: 'source_code', pattern: /github\.com|git (clone|grep|ls-tree|log)|\/workspace\/repos/ },
  { id: 'prior_memory', pattern: /\/workspace\/(memories|wiki)/ },
];

export const RECOVERY_EVIDENCE_FAMILIES_SCORE = 'recovery_evidence_families';

interface CallArguments {
  tool_id?: string;
  arguments?: unknown;
}

/** The evidence families a round reached, from its tool calls' arguments alone. */
export const familiesReached = (steps: readonly CallArguments[]): string[] => {
  const text = steps
    .map(({ tool_id: toolId, arguments: args }) => `${toolId ?? ''} ${JSON.stringify(args ?? {})}`)
    .join('\n');
  return EVIDENCE_FAMILIES.filter(({ pattern }) => pattern.test(text)).map(({ id }) => id);
};

export const recoveryEvidenceFamiliesJudge: RegisteredEvaluatorDefinition = {
  name: 'nightshift_recovery_evidence_families',
  version: '1.0.0',
  kind: 'code',
  direction: 'maximize',
  description:
    'Reference-free, no model call: how many kinds of data a recovery round queried (alert documents, rule event log, APM metrics and traces, service logs, remote clusters, chat records, source code, memory), read from the tool-call arguments.',
  evidenceSchema: roundEvidenceSchema,
  async evaluate({ round }) {
    if (round.steps.length === 0) {
      return { scores: [], notApplicable: { reason: 'the round made no tool calls' } };
    }
    const reached = familiesReached(round.steps);
    return {
      scores: [
        {
          name: RECOVERY_EVIDENCE_FAMILIES_SCORE,
          score: reached.length / EVIDENCE_FAMILIES.length,
          label: `${reached.length}/${EVIDENCE_FAMILIES.length} families`,
          explanation: `Queried: ${reached.join(', ') || 'none'}.`,
          metadata: { tags: reached.map((family) => `family:${family}`) },
        },
      ],
    };
  },
};
