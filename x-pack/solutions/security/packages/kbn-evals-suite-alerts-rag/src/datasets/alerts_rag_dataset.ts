/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AlertsRagExample } from '../dataset';

/**
 * Questions from the LangSmith dataset
 * "Alerts RAG Regression (Episodes 1-8)" (id: bd5bba1d-97aa-4512-bce7-b09aa943c651).
 *
 * The original LangSmith dataset shipped a 95-alert synthetic context inline
 * with each example so the assistant could be evaluated without a real alerts
 * index. In `@kbn/evals` we drive the suite end-to-end through Agent Builder
 * (`/api/agent_builder/converse`), which retrieves alerts from Elasticsearch
 * via its own tools — so the inline context is no longer applicable. We
 * therefore ship only the questions plus reference answers whose phrasing is
 * dataset-agnostic (prioritisation guidance, host/user listing shape,
 * recency reasoning) and keep them as targets for the LLM-as-judge
 * Factuality / Relevance / Groundedness evaluators.
 *
 * Alerts in the eval cluster come from the shared security-alerts GCS
 * snapshot — the same one the Attack Discovery suite uses — restored before
 * the suite runs by `restoreAlertsSnapshot`. Reusing that snapshot keeps the
 * two security eval suites on a single source of truth for alert regression
 * baselines.
 *
 * Count-/timestamp-specific LangSmith examples (e.g. "How many open alerts do
 * I have?" → "95", "When was the first alert triggered?" → exact timestamp)
 * were intentionally dropped here: those reference answers were calibrated
 * against the synthetic 95-alert fixture and cannot transfer verbatim to the
 * snapshot-backed corpus. Re-anchoring them against the snapshot's actual
 * data is tracked as a follow-up for the security-generative-ai team.
 */
export const alertsRagDataset: AlertsRagExample[] = [
  {
    langsmithExampleId: 'd33b2ebc-0c80-4689-89c0-1d8b63ba5af1',
    input: 'Which alerts should I look at first?',
    expected: {
      reference:
        'Recommend focusing on critical-severity alerts first, then high-severity. The answer should justify the prioritisation by referencing alert severity and (optionally) entity risk.',
    },
    metadata: { category: 'multi_alert_correlation', dataset_split: ['base'] },
  },
  {
    langsmithExampleId: '9e6ed876-5308-4a24-b931-03bf72a49200',
    input: 'Based on my open alerts, what hosts are affected?',
    expected: {
      reference:
        'List the distinct hostnames present in the open alerts (host.name values). The answer should enumerate hosts (e.g. as a bulleted list) and not invent hosts that are not in the data.',
    },
    metadata: { category: 'field_specific_lookup', dataset_split: ['base'] },
  },
  {
    langsmithExampleId: 'e4c66fba-0f53-43bb-b923-a11f5d39b84b',
    input: 'Which "user.name" is mentioned the most in the open alerts?',
    expected: {
      reference:
        'Identify the user.name that appears most frequently across the open alerts. The answer should name a single user and may optionally include the count.',
    },
    metadata: { category: 'field_specific_lookup', dataset_split: ['base'] },
  },
  {
    langsmithExampleId: 'b2c3d4e5-f6a7-8901-bcde-f01234567891',
    input: 'What is the most recent alert?',
    expected: {
      reference:
        'Identify the alert with the latest @timestamp in the open-alerts set. The answer should mention the rule name and host of the most recent alert and may include the timestamp.',
    },
    metadata: { category: 'temporal_query', dataset_split: ['base'] },
  },
];
