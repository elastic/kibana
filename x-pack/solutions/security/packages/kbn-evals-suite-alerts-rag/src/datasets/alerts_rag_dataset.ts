/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AlertsRagExample } from '../dataset';

/**
 * Alerts RAG regression dataset.
 *
 * Each example is a question/reference pair driven through Agent Builder
 * (`/api/agent_builder/converse`). Alerts in the eval cluster come from the
 * shared security-alerts GCS snapshot — the same one the Attack Discovery
 * suite uses — restored before the suite runs by `restoreAlertsSnapshot`.
 *
 * Reference answers are phrased to be data-agnostic (they describe the
 * shape of a correct response — prioritisation guidance, host/user listing,
 * recency reasoning) so the LLM-as-judge Factuality / Relevance /
 * Groundedness evaluators score the answer semantically rather than against
 * exact counts or timestamps that depend on the snapshot's contents.
 */
export const alertsRagDataset: AlertsRagExample[] = [
  {
    input: 'Which alerts should I look at first?',
    expected: {
      reference:
        'Recommend focusing on critical-severity alerts first, then high-severity. The answer should justify the prioritisation by referencing alert severity and (optionally) entity risk.',
    },
    metadata: { category: 'multi_alert_correlation', dataset_split: ['base'] },
  },
  {
    input: 'Based on my open alerts, what hosts are affected?',
    expected: {
      reference:
        'List the distinct hostnames present in the open alerts (host.name values). The answer should enumerate hosts (e.g. as a bulleted list) and not invent hosts that are not in the data.',
    },
    metadata: { category: 'field_specific_lookup', dataset_split: ['base'] },
  },
  {
    input: 'Which "user.name" is mentioned the most in the open alerts?',
    expected: {
      reference:
        'Identify the user.name that appears most frequently across the open alerts. The answer should name a single user and may optionally include the count.',
    },
    metadata: { category: 'field_specific_lookup', dataset_split: ['base'] },
  },
  {
    input: 'What is the most recent alert?',
    expected: {
      reference:
        'Identify the alert with the latest @timestamp in the open-alerts set. The answer should mention the rule name and host of the most recent alert and may include the timestamp.',
    },
    metadata: { category: 'temporal_query', dataset_split: ['base'] },
  },
];
