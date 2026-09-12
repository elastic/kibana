/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Document } from '@langchain/core/documents';
import type { DefendInsight, Replacements } from '@kbn/elastic-assistant-common';

/**
 * Parameters for invoking the Defend Insights graph with pre-retrieved events.
 *
 * This is a simplified interface compared to the full elastic_assistant version,
 * designed specifically for Workflows where events are pre-retrieved.
 */
export interface InvokeDefendInsightsGraphWithDocsParams {
  /** Pre-retrieved and formatted event documents (skips retrieval step) */
  anonymizedDocuments: Document[];
  /** Initial replacements map for anonymization */
  replacements?: Replacements;
  /** Callback when new replacements are generated */
  onNewReplacements?: (replacements: Replacements) => void;
}

/**
 * Result from Defend Insights graph invocation
 */
export interface DefendInsightsGraphResult {
  anonymizedDocuments: Document[];
  insights: DefendInsight[] | null;
  replacements: Replacements;
}

/**
 * This function will be implemented to invoke the Defend Insights graph
 * with pre-injected documents, skipping the retrieval step.
 *
 * The actual implementation will come from elastic_assistant's
 * invokeDefendInsightsGraph, modified to support this use case.
 */
export type InvokeDefendInsightsGraphWithDocs = (
  params: InvokeDefendInsightsGraphWithDocsParams
) => Promise<DefendInsightsGraphResult>;
