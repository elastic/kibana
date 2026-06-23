/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SecuritySkillsExample } from '../dataset';

/**
 * Slim find-security-rules routing dataset. Alert-analysis and threat-hunting
 * routing live in dedicated E2E suites (alerts-rag, alert-triage); C2 NL
 * collision coverage for rule creation vs find-rules is on security-ai-rules
 * Track B (`rule-generation-routing`).
 */
export const securitySkillsExamples: SecuritySkillsExample[] = [
  {
    input: {
      question: 'List all enabled detection rules tagged with MITRE.',
    },
    expected: {
      reference:
        'Found enabled detection rules with the MITRE tag using discover_rule_tags and find_rules with enabled set to true.',
      expectedSkill: 'find-security-rules',
      tool_sequence: ['security.find_rules'],
    },
    metadata: {
      category: 'find-rules',
      query_intent: 'Rule Discovery',
      dataset_split: ['base'],
      expectedOnlyToolId: 'security.find_rules',
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
      tool_sequence: ['security.find_rules'],
    },
    metadata: {
      category: 'find-rules',
      query_intent: 'MITRE Technique Query',
      dataset_split: ['base'],
      expectedOnlyToolId: 'security.find_rules',
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
      tool_sequence: ['security.find_rules'],
    },
    metadata: {
      category: 'find-rules',
      query_intent: 'Rule Count',
      dataset_split: ['base'],
      expectedOnlyToolId: 'security.find_rules',
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
      tool_sequence: ['security.find_rules'],
    },
    metadata: {
      category: 'find-rules',
      query_intent: 'Rule Discovery',
      dataset_split: ['base'],
      expectedOnlyToolId: 'security.find_rules',
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
      shouldNotActivateSkill: 'find-security-rules',
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
