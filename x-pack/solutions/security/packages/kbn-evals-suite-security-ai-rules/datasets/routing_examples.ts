/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { sampleRules } from './sample_rules';

const CREATE_RULE_TOOL_ID = 'security.create_detection_rule';
const FIND_RULES_TOOL_ID = 'security.find_rules';

export interface RuleRoutingExample {
  id: string;
  input: { question: string };
  expected: {
    reference: string;
    expectedSkill?: string;
    shouldNotActivateSkill?: string;
    tool_sequence?: string[];
  };
  metadata: {
    category: 'rule-creation' | 'find-rules' | 'distractor';
    routing_intent: string;
    dataset_split: string[];
    is_distractor?: boolean;
    expectedToolId?: string;
    expectedOnlyToolId?: string;
    forbiddenToolId?: string;
    tool_sequence?: string[];
  };
}

/**
 * Natural-language routing examples for the default Elastic agent (`elastic-ai-agent`).
 * Track B: skill collision + tool routing — no forced tool prompt, no rule attachment.
 */
const ruleCreationExamples: RuleRoutingExample[] = sampleRules.slice(0, 3).map((rule) => ({
  id: `routing-create-${rule.id}`,
  input: { question: rule.prompt },
  expected: {
    reference:
      'The agent should route to detection rule creation via security.create_detection_rule, not load the find-security-rules skill.',
    shouldNotActivateSkill: 'find-security-rules',
    tool_sequence: [CREATE_RULE_TOOL_ID],
  },
  metadata: {
    category: 'rule-creation',
    routing_intent: 'Rule Creation',
    dataset_split: ['base'],
    expectedToolId: CREATE_RULE_TOOL_ID,
    tool_sequence: [CREATE_RULE_TOOL_ID],
  },
}));

const findRulesExamples: RuleRoutingExample[] = [
  {
    id: 'routing-find-mitre-tag',
    input: { question: 'List all enabled detection rules tagged with MITRE.' },
    expected: {
      reference:
        'The agent should load find-security-rules and call security.find_rules — not create a new detection rule.',
      expectedSkill: 'find-security-rules',
      tool_sequence: [FIND_RULES_TOOL_ID],
    },
    metadata: {
      category: 'find-rules',
      routing_intent: 'Rule Discovery',
      dataset_split: ['base'],
      expectedOnlyToolId: FIND_RULES_TOOL_ID,
      forbiddenToolId: CREATE_RULE_TOOL_ID,
      tool_sequence: [FIND_RULES_TOOL_ID],
    },
  },
  {
    id: 'routing-find-mitre-technique',
    input: { question: 'Show me detection rules covering MITRE technique T1059.' },
    expected: {
      reference:
        'The agent should load find-security-rules and query rules by MITRE technique — not invoke rule creation.',
      expectedSkill: 'find-security-rules',
      tool_sequence: [FIND_RULES_TOOL_ID],
    },
    metadata: {
      category: 'find-rules',
      routing_intent: 'MITRE Technique Query',
      dataset_split: ['base'],
      expectedOnlyToolId: FIND_RULES_TOOL_ID,
      forbiddenToolId: CREATE_RULE_TOOL_ID,
      tool_sequence: [FIND_RULES_TOOL_ID],
    },
  },
  {
    id: 'routing-find-custom-count',
    input: { question: 'How many custom (non-prebuilt) detection rules do I have enabled?' },
    expected: {
      reference:
        'The agent should inventory rules via find-security-rules — not generate a new rule.',
      expectedSkill: 'find-security-rules',
      tool_sequence: [FIND_RULES_TOOL_ID],
    },
    metadata: {
      category: 'find-rules',
      routing_intent: 'Rule Count',
      dataset_split: ['base'],
      expectedOnlyToolId: FIND_RULES_TOOL_ID,
      forbiddenToolId: CREATE_RULE_TOOL_ID,
      tool_sequence: [FIND_RULES_TOOL_ID],
    },
  },
];

const distractorExamples: RuleRoutingExample[] = [
  {
    id: 'routing-distractor-dashboards',
    input: { question: 'Show me the available dashboards in Kibana.' },
    expected: {
      reference:
        'Platform query — should not load find-security-rules or create a detection rule.',
      shouldNotActivateSkill: 'find-security-rules',
    },
    metadata: {
      category: 'distractor',
      routing_intent: 'Platform',
      dataset_split: ['distractor'],
      is_distractor: true,
      forbiddenToolId: CREATE_RULE_TOOL_ID,
    },
  },
  {
    id: 'routing-distractor-apm',
    input: { question: 'What is the current status of my APM services?' },
    expected: {
      reference: 'Observability query — should not create a detection rule.',
      shouldNotActivateSkill: 'find-security-rules',
    },
    metadata: {
      category: 'distractor',
      routing_intent: 'Observability',
      dataset_split: ['distractor'],
      is_distractor: true,
      forbiddenToolId: CREATE_RULE_TOOL_ID,
    },
  },
];

export const ruleRoutingExamples: RuleRoutingExample[] = [
  ...ruleCreationExamples,
  ...findRulesExamples,
  ...distractorExamples,
];

export const ruleCreationRoutingExamples = ruleCreationExamples;
export const findRulesRoutingExamples = findRulesExamples;
export const routingDistractorExamples = distractorExamples;
