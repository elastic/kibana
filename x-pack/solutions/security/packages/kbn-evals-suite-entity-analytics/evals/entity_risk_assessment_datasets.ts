/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityAnalyticsExample } from '../src/evaluate_dataset';

/**
 * ES|QL for top users by risk score (P001 / P007).
 * Aligned with Entity Analytics risk score tool / security-solution-evals canonical form:
 * filter by calculated_score_norm IS NOT NULL, KEEP includes id_value/id_field.
 */
const TOP_USERS_RISK_SCORE_ESQL = `FROM risk-score.risk-score-latest-default
| WHERE user.risk.calculated_score_norm IS NOT NULL
| KEEP @timestamp, user.risk.calculated_score_norm, user.risk.calculated_level, user.risk.id_value, user.risk.id_field
| SORT user.risk.calculated_score_norm DESC
| LIMIT 10`;

/**
 * ES|QL for a single user's risk score over time (P004).
 * Uses risk-score time series index and filters by user name and 90-day window.
 */
const USER_RISK_SCORE_OVER_TIME_ESQL = `FROM risk-score.risk-score-default
| WHERE user.name == "John" AND @timestamp >= NOW() - 90 days
| KEEP @timestamp, user.risk.calculated_score_norm, user.risk.calculated_level
| SORT @timestamp`;

export const ENTITY_RISK_ASSESSMENT_EXAMPLES: EntityAnalyticsExample[] = [
  {
    input: {
      question: 'Which users have the highest risk scores?',
    },
    output: {
      criteria: [
        'Response addresses which users have the highest risk scores.',
        'Response uses or suggests querying risk score data (e.g. risk-score.risk-score-latest-default or equivalent).',
        'Response identifies user entities and risk scores (or equivalent metrics).',
      ],
      expectedEsql: TOP_USERS_RISK_SCORE_ESQL,
    },
  },
  {
    input: {
      question: 'Show me entities with anomalous behavior in the last 24h',
    },
    output: {
      criteria: [
        'Response addresses entities with anomalous behavior in the last 24 hours.',
        'Response constrains the time range to the last 24 hours.',
        'Response refers to anomaly or risk/behavior data relevant to entity analytics.',
      ],
    },
  },
  {
    input: {
      question: 'Which service accounts have unusual access patterns?',
    },
    output: {
      criteria: [
        'Response addresses service accounts and access patterns.',
        'Response distinguishes or focuses on service accounts (or equivalent).',
        'Response refers to unusual or anomalous access patterns.',
      ],
    },
  },
  {
    input: {
      question: "Show me how John's risk score has changed over the last 90 days",
    },
    output: {
      criteria: [
        'Response addresses how a specific user (John) risk score changed over time.',
        'Response constrains to the last 90 days.',
        'Response uses or suggests risk score history (e.g. risk-score.risk-score-default or time-bucketed data).',
      ],
      expectedEsql: USER_RISK_SCORE_OVER_TIME_ESQL,
    },
  },
  {
    input: {
      question: 'Which 10 users have the highest risk scores right now?',
    },
    output: {
      criteria: [
        'Response addresses the top 10 users by risk score (current/latest).',
        'Response uses or suggests the latest risk score index and limits to 10 users.',
        'Response identifies user entities and risk scores.',
      ],
      expectedEsql: TOP_USERS_RISK_SCORE_ESQL,
    },
  },
];

export const ENTITY_RISK_ASSESSMENT_DATASET = {
  name: 'entity-analytics: entity risk assessment',
  description:
    'Entity risk assessment questions: highest risk users, risk over time, anomalous behavior, service accounts.',
  examples: ENTITY_RISK_ASSESSMENT_EXAMPLES,
};
