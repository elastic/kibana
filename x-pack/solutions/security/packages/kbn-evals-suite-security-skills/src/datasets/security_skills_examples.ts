/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SecuritySkillsExample } from '../dataset';

export const securitySkillsExamples: SecuritySkillsExample[] = [
  {
    input: {
      question: 'List all enabled detection rules tagged with MITRE.',
    },
    expected: {
      reference:
        'Found enabled detection rules with the MITRE tag using discover_rule_tags and find_rules with enabled set to true.',
      expectedSkill: 'find-security-rules',
    },
    metadata: {
      category: 'find-rules',
      query_intent: 'Rule Discovery',
      dataset_split: ['base'],
    },
  },
  {
    input: {
      question: 'Show me detection rules covering MITRE technique T1059.',
    },
    expected: {
      reference:
        'Found detection rules mapped to MITRE technique T1059 using find_rules with mitreTechnique set to T1059.',
      expectedSkill: 'find-security-rules',
    },
    metadata: {
      category: 'find-rules',
      query_intent: 'MITRE Technique Query',
      dataset_split: ['base'],
    },
  },
  {
    input: {
      question: 'How many custom (non-prebuilt) detection rules do I have enabled?',
    },
    expected: {
      reference:
        'There are enabled custom detection rules. The find_rules tool was called with enabled set to true and ruleSource set to custom.',
      expectedSkill: 'find-security-rules',
    },
    metadata: {
      category: 'find-rules',
      query_intent: 'Rule Count',
      dataset_split: ['base'],
    },
  },
  {
    input: {
      question: 'Show me my critical severity detection rules.',
    },
    expected: {
      reference:
        'Found critical severity detection rules using find_rules filtered by severity critical.',
      expectedSkill: 'find-security-rules',
    },
    metadata: {
      category: 'find-rules',
      query_intent: 'Rule Discovery',
      dataset_split: ['base'],
    },
  },
  {
    input: {
      question:
        'I have a critical severity alert for credential access on host WIN-SRV01. Help me triage this alert.',
    },
    expected: {
      reference:
        'I will help triage this alert by fetching alert details, related activity, and entity risk context.',
      expectedSkill: 'alert-analysis',
    },
    metadata: {
      category: 'security-skills',
      query_intent: 'Alert Triage',
      dataset_split: ['base'],
    },
  },
  {
    input: {
      question:
        'Hunt for lateral movement in my environment. Look for remote service creation and suspicious logon types over the last 7 days.',
    },
    expected: {
      reference:
        'I will search for lateral movement indicators using ES|QL queries across endpoint and Windows event logs.',
      expectedSkill: 'threat-hunting',
    },
    metadata: {
      category: 'security-skills',
      query_intent: 'Threat Hunting',
      dataset_split: ['base'],
    },
  },
  {
    input: {
      question:
        'Check the entity risk score for user admin@corp.local and look for any alerts associated with this account in the last 48 hours.',
    },
    expected: {
      reference:
        "I will retrieve the entity risk score for admin@corp.local and search for associated alerts to assess this account's risk profile.",
      expectedSkill: 'alert-analysis',
    },
    metadata: {
      category: 'security-skills',
      query_intent: 'Risk Assessment with Alerts',
      dataset_split: ['base'],
    },
  },
  {
    input: {
      question: 'Why did alert abc123 fire? Help me triage it and check related activity.',
    },
    expected: {
      reference:
        'I will investigate alert abc123 by looking at alert details and related timeline activity — not a find-rules inventory query.',
      expectedSkill: 'alert-analysis',
    },
    metadata: {
      category: 'security-skills',
      query_intent: 'Alert Triage (not find-rules)',
      dataset_split: ['base'],
    },
  },
  {
    input: {
      question: 'Show me the available dashboards in Kibana.',
    },
    expected: {
      reference:
        'I will search for available dashboards. This is a platform query, not a security skill task.',
      shouldNotActivateSkill: 'find-security-rules',
    },
    metadata: {
      category: 'distractor',
      query_intent: 'Platform',
      dataset_split: ['distractor'],
      is_distractor: true,
    },
  },
  {
    input: {
      question: 'What is the current status of my APM services?',
    },
    expected: {
      reference: 'I will check APM service status. This is an observability query.',
      shouldNotActivateSkill: 'alert-analysis',
    },
    metadata: {
      category: 'distractor',
      query_intent: 'Observability',
      dataset_split: ['distractor'],
      is_distractor: true,
    },
  },
];

export const happyPathExamples = securitySkillsExamples.filter((ex) => !ex.metadata.is_distractor);
export const distractorExamples = securitySkillsExamples.filter((ex) => ex.metadata.is_distractor);
