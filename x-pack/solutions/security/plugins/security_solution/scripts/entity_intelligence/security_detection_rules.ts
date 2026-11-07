/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';
import { securityEventsIndex } from '../../common/entity_intelligence/security_events';

const keyword = { type: 'keyword', ignore_above: 1024 } as const;
const description = { type: 'text', index: false } as const;
const clause = {
  properties: { id: keyword, name: keyword, condition: description, expected: keyword },
};

export const SECURITY_STORY_MAPPING: MappingTypeMapping = {
  dynamic: 'strict',
  properties: {
    '@timestamp': { type: 'date' },
    event: {
      properties: {
        id: keyword,
        kind: keyword,
        dataset: keyword,
        provider: keyword,
        action: keyword,
        category: keyword,
        type: keyword,
        outcome: keyword,
      },
    },
    agent: { properties: { id: keyword, name: keyword, type: keyword } },
    user: { properties: { id: keyword, name: keyword, hash: keyword } },
    host: { properties: { id: keyword, name: keyword } },
    service: { properties: { id: keyword, name: keyword } },
    session: { properties: { id: keyword } },
    trace: { properties: { id: keyword } },
    entity: { properties: { id: keyword } },
    source: { properties: { ip: { type: 'ip' } } },
    destination: { properties: { domain: keyword, ip: { type: 'ip' } } },
    file: { properties: { path: keyword, name: keyword } },
    process: { properties: { name: keyword } },
    related: { properties: { user: keyword, hosts: keyword } },
    kibana: { properties: { space_id: keyword } },
    entity_intelligence: {
      properties: {
        schema_version: { type: 'integer' },
        request_id: keyword,
        invocation: {
          properties: {
            request_id: keyword,
            runtime_principal: keyword,
            operation_outcome: keyword,
            tool_call_id: keyword,
            tool_name: keyword,
            turn_id: keyword,
            trace_id: keyword,
            span_id: keyword,
            invocation_span_id: keyword,
            conversation_id: keyword,
            actor_hash: keyword,
            actor_round_id: keyword,
            actor_source: keyword,
            observation_index: keyword,
            observation_id: keyword,
            input_record_hash: keyword,
            input_source: keyword,
            correlation: keyword,
            input: description,
            input_redacted: { type: 'boolean' },
            input_truncated: { type: 'boolean' },
            process_exit_code: { type: 'integer' },
          },
        },
        actor_provenance: keyword,
        agent: {
          properties: { id: keyword, name: keyword, provider: keyword, session_id: keyword },
        },
        activity: { properties: { type: keyword, target: keyword } },
        control: {
          properties: {
            id: keyword,
            name: keyword,
            version: keyword,
            engine: keyword,
            mode: keyword,
            decision: keyword,
            outcome: keyword,
            reason: description,
            severity: keyword,
            clause,
            policy_sha256: keyword,
            definition: {
              properties: {
                policy_id: keyword,
                policy_version: { type: 'integer' },
                description,
                scope: description,
                clauses: clause,
              },
            },
          },
        },
        scenario: { properties: { id: keyword, step: { type: 'integer' }, kind: keyword } },
      },
    },
  },
};

interface RuleSpec {
  slug: string;
  name: string;
  description: string;
  query: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  riskScore: number;
}

const controlDeny = 'entity_intelligence.control.decision: "deny"';
const enforcedBlock = `${controlDeny} and entity_intelligence.control.mode: "enforce" and entity_intelligence.control.outcome: "blocked"`;
const rules: readonly RuleSpec[] = [
  {
    slug: 'protected-read-blocked',
    name: 'Protected file access blocked by policy',
    description:
      'An enforcing policy recorded denial of protected-file access and a blocked outcome. This is prevention evidence, not evidence of compromise.',
    query: `entity_intelligence.activity.type: "protected_file_access" and ${enforcedBlock}`,
    severity: 'medium',
    riskScore: 47,
  },
  {
    slug: 'export-blocked',
    name: 'Data export blocked by policy',
    description:
      'An enforcing policy recorded denial of an export and a blocked outcome. Inspect the source policy engine and target to establish the control boundary.',
    query: `entity_intelligence.activity.type: "unapproved_export" and ${enforcedBlock}`,
    severity: 'high',
    riskScore: 73,
  },
  {
    slug: 'export-allowed',
    name: 'Prohibited data export was allowed',
    description:
      'A policy recorded an export as prohibited while explicitly reporting that the operation was allowed. Review the policy mode and destination; this rule does not infer exfiltration or compromise.',
    query: `entity_intelligence.activity.type: "unapproved_export" and ${controlDeny} and entity_intelligence.control.outcome: "allowed"`,
    severity: 'critical',
    riskScore: 91,
  },
  {
    slug: 'privilege-change',
    name: 'Unapproved privilege change observed',
    description:
      'An explicit policy violation accompanied an allowed privilege change. Inspect the recorded account and host and validate whether this access was authorized.',
    query: `entity_intelligence.activity.type: "privilege_change" and ${controlDeny} and entity_intelligence.control.outcome: "allowed"`,
    severity: 'high',
    riskScore: 73,
  },
  {
    slug: 'suspicious-authentication',
    name: 'Account sign-in requires investigation',
    description:
      'A source explicitly classified an authentication as suspicious. A successful authentication alone does not establish compromise or a bypassed guardrail.',
    query:
      'entity_intelligence.activity.type: "suspicious_authentication" and event.category: "authentication"',
    severity: 'high',
    riskScore: 73,
  },
];

export interface SecurityDetectionRule {
  rule_id: string;
  name: string;
  description: string;
  type: 'query';
  language: 'kuery';
  index: string[];
  query: string;
  severity: RuleSpec['severity'];
  risk_score: number;
  interval: string;
  from: string;
  to: string;
  enabled: boolean;
  max_signals: number;
  actions: never[];
  tags: string[];
  author: string[];
  false_positives: string[];
  note: string;
}

/** Builds real query rules over structured security observations, without synthesizing alert documents. */
export const buildSecurityDetectionRules = (spaceId: string): SecurityDetectionRule[] =>
  rules.map((rule) => ({
    rule_id: `entity-intelligence-${rule.slug}-v1`,
    name: rule.name,
    description: rule.description,
    type: 'query' as const,
    language: 'kuery' as const,
    index: [securityEventsIndex(spaceId)],
    query: `entity_intelligence.schema_version: 1 and kibana.space_id: "${spaceId}" and (${rule.query})`,
    severity: rule.severity,
    risk_score: rule.riskScore,
    interval: '1m',
    from: 'now-30m',
    to: 'now',
    enabled: true,
    max_signals: 100,
    actions: [],
    tags: ['Entity Intelligence', 'Structured security evidence'],
    author: ['Entity Intelligence'],
    false_positives: [
      'Authorized controlled exercises; inspect source provenance and applicable policy.',
    ],
    note: 'Inspect the source event and explicit control outcome. Blocked activity is prevention evidence. Allowed prohibited activity warrants investigation; neither proves compromise by itself.',
  }));

/** Builds four severity-specific detections over managed monitor policy matches. */
export const buildAiPolicyDetectionRules = (spaceId: string): SecurityDetectionRule[] =>
  (['low', 'medium', 'high', 'critical'] as const).map((severity) => ({
    rule_id: `entity-intelligence-ai-policy-${severity}-v1`,
    name: `AI tool call matched a ${severity} severity policy`,
    description:
      'A recorded native tool call matched an enabled AI policy. This detection records the matched input and policy revision; it does not block activity or establish that access or export succeeded.',
    type: 'query',
    language: 'kuery',
    index: [securityEventsIndex(spaceId)],
    query: `entity_intelligence.schema_version: 1 and kibana.space_id: "${spaceId}" and event.action: "ai_policy_match" and entity_intelligence.control.mode: "monitor" and entity_intelligence.control.severity: "${severity}"`,
    severity,
    risk_score: { low: 21, medium: 47, high: 73, critical: 91 }[severity],
    interval: '1m',
    from: 'now-25h',
    to: 'now',
    enabled: true,
    max_signals: 1000,
    actions: [],
    tags: ['Entity Intelligence', 'Managed AI policy monitoring'],
    author: ['Entity Intelligence'],
    false_positives: [
      'Authorized operations can match literal input conditions. Review the exact call and policy scope.',
    ],
    note: 'Detection only. Open the native observation and immutable policy revision to see precisely what matched. A tool failure is not evidence that this policy blocked it.',
  }));
