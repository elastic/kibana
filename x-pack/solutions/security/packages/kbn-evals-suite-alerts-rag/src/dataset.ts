/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Scenario category for an alerts RAG example.
 * - single_alert_query: User asks about a specific individual alert.
 * - multi_alert_correlation: User asks about patterns, counts, prioritisation, or
 *   relationships that require reasoning across multiple alerts at once.
 * - temporal_query: User asks about time-based aspects of alerts (e.g. "last hour",
 *   "trending", "first seen").
 * - field_specific_lookup: User asks which hosts, IPs, users, or other field values
 *   appear in the alert set.
 */
export type AlertsRagCategory =
  | 'single_alert_query'
  | 'multi_alert_correlation'
  | 'temporal_query'
  | 'field_specific_lookup';

/** Required fields on every alert document provided as RAG context. */
export interface AlertDocumentSource {
  '@timestamp': string;
  kibana: {
    alert: {
      rule: { name: string };
      severity: string;
      status: string;
    };
  };
}

export interface AlertDocument {
  _id: string;
  _source: AlertDocumentSource;
}

export interface AlertsRagExample {
  /**
   * LangSmith example UUID, for traceability back to the source dataset.
   * Dataset: "Alerts RAG Regression (Episodes 1-8)"
   * Dataset ID: bd5bba1d-97aa-4512-bce7-b09aa943c651
   */
  langsmithExampleId: string;
  input: string;
  expected: { reference: string };
  /** Alert documents used as RAG context for this example. */
  context?: AlertDocument[];
  metadata: {
    category: AlertsRagCategory;
    dataset_split: string[];
  };
}

/**
 * Validates that each alert document in the given context array contains all
 * required fields. Throws a descriptive error on the first violation so
 * dataset authors get actionable feedback when a field is missing.
 */
export const validateAlertContext = (context: AlertDocument[]): void => {
  for (const doc of context) {
    if (!doc._id) {
      throw new Error('Alert document is missing required field: _id');
    }
    const src = doc._source;
    if (!src['@timestamp']) {
      throw new Error(`Alert document "${doc._id}" is missing required field: _source.@timestamp`);
    }
    if (!src.kibana.alert.rule.name) {
      throw new Error(
        `Alert document "${doc._id}" is missing required field: _source.kibana.alert.rule.name`
      );
    }
    if (!src.kibana.alert.severity) {
      throw new Error(
        `Alert document "${doc._id}" is missing required field: _source.kibana.alert.severity`
      );
    }
    if (!src.kibana.alert.status) {
      throw new Error(
        `Alert document "${doc._id}" is missing required field: _source.kibana.alert.status`
      );
    }
  }
};

export const LANGSMITH_DATASET_ID = 'bd5bba1d-97aa-4512-bce7-b09aa943c651';
export const LANGSMITH_DATASET_NAME = 'Alerts RAG Regression (Episodes 1-8)';

/**
 * All 6 examples exported from LangSmith dataset "Alerts RAG Regression (Episodes 1-8)"
 * (id: bd5bba1d-97aa-4512-bce7-b09aa943c651, exported 2026-05-07).
 *
 * These test the Security AI Assistant's ability to retrieve and reason about
 * alert data via RAG against the "Episodes 1-8" scenario (95 open alerts across
 * 8 simulated attack episodes). Each question requires the assistant to query
 * open alerts and produce a factually correct response grounded in the retrieved context.
 *
 * Context: 95 open alerts — 85 critical, 10 high — spanning hosts SRVMAC08,
 * SRVWIN01–07, SRVNIX05, and their -PRIV variants; primary user: Administrator.
 *
 * Category breakdown:
 *   multi_alert_correlation  – 4 examples (aggregate counts, prioritisation)
 *   field_specific_lookup    – 2 examples (hosts, user field values)
 *   single_alert_query       – 0 examples (no single-alert questions in this dataset)
 *   temporal_query           – 0 examples (no time-scoped questions in this dataset)
 */
export const alertsRagDataset: AlertsRagExample[] = [
  // ── Multi-alert correlation (aggregate counts) ────────────────────────────
  {
    langsmithExampleId: '5caa283f-eabd-460b-a48d-d308e6378508',
    input: 'How many open alerts do I have?',
    expected: {
      reference: 'There is a total of 95 open alerts.',
    },
    metadata: { category: 'multi_alert_correlation', dataset_split: ['base'] },
  },
  {
    langsmithExampleId: '8199e09a-d175-4808-be93-012e51d4ecac',
    input: 'How many critical severity alerts are there?',
    expected: {
      reference: 'There are 85 critical severity alerts in your environment.',
    },
    metadata: { category: 'multi_alert_correlation', dataset_split: ['base'] },
  },
  {
    langsmithExampleId: '82ca4de2-e4fb-4211-9e98-ae5a2fadf2cb',
    input: 'How many high severity alerts are there?',
    expected: {
      reference: 'There are 10 high severity alerts in your environment.',
    },
    metadata: { category: 'multi_alert_correlation', dataset_split: ['base'] },
  },

  // ── Multi-alert correlation (prioritisation) ──────────────────────────────
  {
    langsmithExampleId: 'd33b2ebc-0c80-4689-89c0-1d8b63ba5af1',
    input: 'Which alerts should I look at first?',
    expected: {
      reference: `Based on the alert counts from the last 24 hours, I recommend focusing on the critical alerts first.\nGiven this information, you should prioritize your attention as follows:\n\n1. Start with the critical alerts. These pose the highest risk to your environment and require immediate attention.\n2. After addressing the critical alerts, move on to the high severity alerts.`,
    },
    metadata: { category: 'multi_alert_correlation', dataset_split: ['base'] },
  },

  // ── Field-specific lookup ─────────────────────────────────────────────────
  {
    langsmithExampleId: 'e4c66fba-0f53-43bb-b923-a11f5d39b84b',
    input: 'Which "user.name" is mentioned the most in the open alerts?',
    expected: {
      reference: 'The user name "Administrator" is mentioned the most in the open alerts.',
    },
    metadata: { category: 'field_specific_lookup', dataset_split: ['base'] },
  },
  {
    langsmithExampleId: '9e6ed876-5308-4a24-b931-03bf72a49200',
    input: 'Based on my open alerts, what hosts are affected?',
    expected: {
      reference: `Based on the data provided, here's a summary of the hosts affected by open alerts:\n\n1. SRVMAC08\n2. SRVWIN07\n3. SRVWIN06\n4. SRVNIX05\n5. SRVWIN04\n6. SRVWIN03\n7. SRVWIN02\n8. SRVWIN01\n\nAdditionally, there are some hosts with the "-PRIV" suffix, which appear to be related to prevention alerts:\n\n9. SRVMAC08-PRIV\n10. SRVWIN06-PRIV\n11. SRVWIN04-PRIV\n12. SRVWIN03-PRIV\n13. SRVWIN02-PRIV\n14. SRVWIN01-PRIV\n\nThese hosts are affected by various types of malware, suspicious activities, and potential security threats as indicated by the alerts.`,
    },
    metadata: { category: 'field_specific_lookup', dataset_split: ['base'] },
  },
];
