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
