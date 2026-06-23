/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MultiStepExample } from '../dataset';

const SECURITY_ALERTS = 'security.alerts';
const SECURITY_GET_ENTITY = 'security.get_entity';
const SECURITY_CREATE_RULE = 'security.create_detection_rule';
const SECURITY_FIND_RULES = 'security.find_rules';
const SECURITY_ENTITY_RISK = 'security.entity_risk_score';

export const multiStepScenarios: MultiStepExample[] = [
  {
    input: {
      turns: [
        'I see a suspicious alert about unusual PowerShell activity on host win-dc-01. Can you analyze it?',
        'Can you investigate the host and user entities involved in that alert?',
        'Based on this investigation, create a detection rule for this PowerShell execution pattern.',
      ],
    },
    expected: {
      reference:
        'The agent should triage the alert (severity, host, user context), investigate entities via the entity store, then propose or create a detection rule covering the PowerShell pattern. Answers must stay grounded in retrieved alert/entity data — no fabricated hosts or rule fields.',
      tool_sequence: [SECURITY_ALERTS, SECURITY_GET_ENTITY, SECURITY_CREATE_RULE],
      primary_skill: 'alert-analysis',
    },
    metadata: {
      scenario: 'full_chain_triage_investigate_rule',
      dataset_split: ['base'],
    },
  },
  {
    input: {
      turns: [
        'Investigate critical alert id alert-ps-001 about suspicious PowerShell on host win-dc-01.',
        'Find detection rules related to PowerShell execution and MITRE T1059.',
        'Based on what you learned, suggest improvements to our PowerShell detection coverage.',
      ],
    },
    expected: {
      reference:
        'The agent should triage the alert, query rules with find_rules (PowerShell / T1059), then recommend detection improvements grounded in alert and rule inventory data.',
      tool_sequence: [SECURITY_ALERTS, SECURITY_FIND_RULES],
      primary_skill: 'alert-analysis',
    },
    metadata: {
      scenario: 'alert_investigate_rules_recommend',
      dataset_split: ['base'],
    },
  },
  {
    input: {
      turns: [
        'What is the current risk score for host srv-finance-01?',
        'Show me high and critical alerts involving srv-finance-01 in the last 48 hours.',
      ],
    },
    expected: {
      reference:
        'The agent should look up entity risk for srv-finance-01, then search related alerts and correlate findings — entity analytics plus alert analysis.',
      tool_sequence: [SECURITY_ENTITY_RISK, SECURITY_ALERTS],
      primary_skill: 'entity-analytics',
    },
    metadata: {
      scenario: 'entity_risk_alerts_correlation',
      dataset_split: ['base'],
    },
  },
  {
    input: {
      turns: [
        'Triage my top 5 critical alerts from the last 24 hours.',
        'Summarize the common themes, affected hosts, and recommended next steps for leadership.',
      ],
    },
    expected: {
      reference:
        'The agent should retrieve critical alerts, prioritize them, then produce a concise executive summary with hosts, techniques, and next steps.',
      tool_sequence: [SECURITY_ALERTS],
      primary_skill: 'alert-analysis',
    },
    metadata: {
      scenario: 'alert_triage_summary_report',
      dataset_split: ['base'],
    },
  },
  {
    input: {
      turns: [
        'Find all enabled detection rules mapped to MITRE technique T1055 (Process Injection).',
        'Assess whether our T1055 coverage is adequate and call out any gaps.',
      ],
    },
    expected: {
      reference:
        'The agent should use find_rules with mitreTechnique T1055, list matching rules, and assess coverage gaps with actionable recommendations.',
      tool_sequence: [SECURITY_FIND_RULES],
      primary_skill: 'find-security-rules',
    },
    metadata: {
      scenario: 'find_rules_mitre_coverage',
      dataset_split: ['base'],
    },
  },
  {
    input: {
      turns: ["What's the weather in San Francisco today?"],
    },
    expected: {
      reference:
        'This is out of scope for Security Agent Builder. The agent should decline or redirect without invoking security triage, entity investigation, or rule-creation tools.',
      primary_skill: 'alert-analysis',
    },
    metadata: {
      scenario: 'distractor_general',
      dataset_split: ['distractor'],
      is_distractor: true,
    },
  },
  {
    input: {
      turns: ['List my Kibana dashboards.'],
    },
    expected: {
      reference:
        'Dashboard listing is not a multi-step SOC chain. The agent should not run alert triage → investigation → rule creation for this prompt.',
      primary_skill: 'alert-analysis',
    },
    metadata: {
      scenario: 'distractor_general',
      dataset_split: ['distractor'],
      is_distractor: true,
    },
  },
];

export const happyPathScenarios = multiStepScenarios.filter((ex) => !ex.metadata.is_distractor);
export const distractorScenarios = multiStepScenarios.filter((ex) => ex.metadata.is_distractor);
