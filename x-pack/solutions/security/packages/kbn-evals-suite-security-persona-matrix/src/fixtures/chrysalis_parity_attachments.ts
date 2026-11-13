/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentProfile } from '../agent_profile';
import { PARITY_DOCS } from './chrysalis_parity_docs';
import { parityRestampOffset, restamp, seedDocId } from './chrysalis_seed';

/**
 * The detection rule the external benchmark attached to its rule-editing prompts:
 * the rule that bridges the simulator's alerts into the Security alerts index.
 */
export const CHRYSALIS_PASSTHROUGH_RULE = {
  id: 'd4c6822c-f35e-4324-9688-151060dea270',
  rule_id: 'chrysalis-sim-passthrough',
  name: 'Chrysalis Sim Passthrough',
  immutable: false,
  rule_source: { type: 'internal' },
  version: 1,
  revision: 0,
  updated_at: '2026-06-24T22:50:46.673Z',
  updated_by: '246637184',
  created_at: '2026-06-24T22:50:46.673Z',
  created_by: '246637184',
  enabled: true,
  interval: '5m',
  from: 'now-30d',
  to: 'now',
  execution_summary: {
    last_execution: {
      date: '2026-06-27T13:58:34.260Z',
      status: 'succeeded',
      status_order: 0,
      message: 'Rule execution completed successfully',
      metrics: { total_indexing_duration_ms: 6, total_search_duration_ms: 18 },
    },
  },
  description:
    'Bridges synthetic Chrysalis simulation alerts from logs-chrysalis-sim.alerts-default into the Security alerts index so Attack Discovery can correlate them.',
  tags: ['chrysalis-sim', 'lotus-blossom'],
  author: ['Chrysalis Sim'],
  license: 'Elastic License v2',
  threat: [],
  related_integrations: [],
  required_fields: [],
  setup: '',
  false_positives: [],
  references: [],
  risk_score: 73,
  risk_score_mapping: [],
  severity: 'high',
  severity_mapping: [],
  output_index: '',
  max_signals: 1000,
  exceptions_list: [],
  actions: [],
  type: 'query',
  language: 'kuery',
  index: ['logs-chrysalis-sim.alerts-default'],
  query: 'kibana.alert.rule.name:*',
} as const;

const SIM_ALERTS_INDEX = 'logs-chrysalis-sim.alerts-default';
// The benchmark attached the newest Security alert, which on its cluster was the
// passthrough copy of the simulator's last attack-chain alert (the DNS beacon).
const SIM_SOURCE_TIMESTAMP = '2026-10-02T18:40:03.000Z';
const PASSTHROUGH_ALERT_UUID = '7c1f5e0b9d2a4c6e8f3b1a5d7e9c2b4f6a8d0e2c4b6a8f0d2e4c6b8a0f2d4e6c';

const findSimSource = (): { doc: Record<string, unknown>; position: number } => {
  const simDocs = PARITY_DOCS.filter(({ index }) => index === SIM_ALERTS_INDEX);
  const position = simDocs.findIndex(({ doc }) => doc['@timestamp'] === SIM_SOURCE_TIMESTAMP);
  if (position === -1) {
    throw new Error(`Parity corpus has no ${SIM_ALERTS_INDEX} doc at ${SIM_SOURCE_TIMESTAMP}`);
  }
  return { doc: simDocs[position].doc, position };
};

const flattenWithPrefix = (prefix: string, value: Record<string, unknown>) =>
  Object.fromEntries(Object.entries(value).map(([key, v]) => [`${prefix}.${key}`, v]));

/**
 * The DNS-beacon simulator alert as the passthrough rule re-alerts it, built the
 * way the detection engine builds an alert from a source doc: `kibana` and
 * `signal` dropped, `event.*` copied to `kibana.alert.original_event`, the rule's
 * fields, ancestry and reason added, timestamps shifted like the seeded corpus.
 */
export const buildParityPassthroughAlert = (
  nowMs: number = Date.now()
): Record<string, unknown> => {
  const { doc, position } = findSimSource();
  const {
    kibana,
    signal,
    event = {},
    ...source
  } = restamp(doc, parityRestampOffset(nowMs)) as Record<string, unknown> & {
    kibana: { alert: { ancestors: unknown[]; depth: number; rule: { uuid: string } } };
    event?: Record<string, unknown>;
  };
  const { kind: _kind, ...eventWithoutKind } = event as Record<string, unknown>;
  const timestamp = source['@timestamp'] as string;
  const rule = CHRYSALIS_PASSTHROUGH_RULE;

  return {
    ...source,
    event: eventWithoutKind,
    ...flattenWithPrefix('kibana.alert.original_event', event as Record<string, unknown>),
    'kibana.space_ids': ['default'],
    'event.kind': 'signal',
    'kibana.alert.original_time': timestamp,
    'kibana.alert.intended_timestamp': timestamp,
    'kibana.alert.ancestors': [
      ...kibana.alert.ancestors,
      {
        id: seedDocId(SIM_ALERTS_INDEX, position),
        type: 'signal',
        index: SIM_ALERTS_INDEX,
        depth: kibana.alert.depth,
        rule: kibana.alert.rule.uuid,
      },
    ],
    'kibana.alert.status': 'active',
    'kibana.alert.workflow_status': 'open',
    'kibana.alert.depth': kibana.alert.depth + 1,
    'kibana.alert.reason': `intrusion_detection event with process BluetoothService.exe, by SYSTEM on srv-win-defend-01 created ${rule.severity} alert ${rule.name}.`,
    'kibana.alert.severity': rule.severity,
    'kibana.alert.risk_score': rule.risk_score,
    'kibana.alert.rule.actions': [],
    'kibana.alert.rule.author': rule.author,
    'kibana.alert.rule.category': 'Custom Query Rule',
    'kibana.alert.rule.consumer': 'siem',
    'kibana.alert.rule.created_at': rule.created_at,
    'kibana.alert.rule.created_by': rule.created_by,
    'kibana.alert.rule.description': rule.description,
    'kibana.alert.rule.enabled': rule.enabled,
    'kibana.alert.rule.exceptions_list': [],
    'kibana.alert.rule.false_positives': [],
    'kibana.alert.rule.from': rule.from,
    'kibana.alert.rule.immutable': rule.immutable,
    'kibana.alert.rule.interval': rule.interval,
    'kibana.alert.rule.indices': rule.index,
    'kibana.alert.rule.license': rule.license,
    'kibana.alert.rule.max_signals': rule.max_signals,
    'kibana.alert.rule.name': rule.name,
    'kibana.alert.rule.producer': 'siem',
    'kibana.alert.rule.query': rule.query,
    'kibana.alert.rule.references': [],
    'kibana.alert.rule.revision': rule.revision,
    'kibana.alert.rule.risk_score': rule.risk_score,
    'kibana.alert.rule.risk_score_mapping': [],
    'kibana.alert.rule.rule_id': rule.rule_id,
    'kibana.alert.rule.rule_type_id': 'siem.queryRule',
    'kibana.alert.rule.severity': rule.severity,
    'kibana.alert.rule.severity_mapping': [],
    'kibana.alert.rule.tags': rule.tags,
    'kibana.alert.rule.threat': [],
    'kibana.alert.rule.to': rule.to,
    'kibana.alert.rule.type': rule.type,
    'kibana.alert.rule.updated_at': rule.updated_at,
    'kibana.alert.rule.updated_by': rule.updated_by,
    'kibana.alert.rule.uuid': rule.id,
    'kibana.alert.rule.version': rule.version,
    'kibana.alert.uuid': PASSTHROUGH_ALERT_UUID,
    'kibana.alert.workflow_tags': [],
    'kibana.alert.workflow_assignee_ids': [],
  };
};

export type ParityInlineAttachment =
  | { kind: 'alert'; data: Record<string, unknown> }
  | { kind: 'rule'; data: Record<string, unknown> };

const PARITY_ATTACHMENT_KIND: Readonly<Record<string, ParityInlineAttachment['kind']>> = {
  'alert-analysis-a': 'alert',
  'multi-step-a': 'alert',
  'detection-rule-edit-a': 'rule',
  'detection-rule-edit-b': 'rule',
  'detection-rule-edit-c': 'rule',
};

/**
 * The JSON the external benchmark attached to `exampleId`, or undefined when it
 * attached nothing (and always for the default profile).
 */
export const resolveParityInlineAttachment = (
  exampleId: string | undefined,
  profile: AgentProfile,
  nowMs?: number
): ParityInlineAttachment | undefined => {
  if (profile !== 'chrysalis-parity' || exampleId === undefined) return undefined;
  const kind = PARITY_ATTACHMENT_KIND[exampleId];
  if (kind === 'alert') return { kind, data: buildParityPassthroughAlert(nowMs) };
  if (kind === 'rule') return { kind, data: { ...CHRYSALIS_PASSTHROUGH_RULE } };
  return undefined;
};

/** `json.dumps(value, ensure_ascii=False)` output, so the inlined text matches token for token. */
export const toPythonJson = (value: unknown): string => {
  if (Array.isArray(value)) return `[${value.map(toPythonJson).join(', ')}]`;
  if (value !== null && typeof value === 'object') {
    const entries = Object.entries(value).filter(([, v]) => v !== undefined);
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}: ${toPythonJson(v)}`).join(', ')}}`;
  }
  return JSON.stringify(value);
};

/**
 * Kibana has no `json` attachment type, so every attachment the benchmark sent
 * was rejected and it re-sent the prompt with the JSON appended under this
 * header, for rules as well as alerts. The parity profile sends that same input.
 */
export const inlineParityAttachment = (question: string, data: Record<string, unknown>): string =>
  `${question}\n\n--- Attached alert (most recent) ---\n${toPythonJson(data)}`;

export const personaMatrixQueryArgs = (
  exampleId: string | undefined,
  profile: AgentProfile,
  question: string,
  attachment: string | undefined
): [input: string, attachment?: string] => {
  const inlined = resolveParityInlineAttachment(exampleId, profile);
  return inlined ? [inlineParityAttachment(question, inlined.data)] : [question, attachment];
};
