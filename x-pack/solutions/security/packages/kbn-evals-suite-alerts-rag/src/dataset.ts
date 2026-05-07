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
