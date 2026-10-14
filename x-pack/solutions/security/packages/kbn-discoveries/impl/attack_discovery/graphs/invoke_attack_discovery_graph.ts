/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Document } from '@langchain/core/documents';
import type { AttackDiscovery, Replacements } from '@kbn/elastic-assistant-common';

/**
 * Parameters for invoking the Attack Discovery graph with pre-retrieved alerts.
 *
 * This is a simplified interface compared to the full elastic_assistant version,
 * designed specifically for Workflows where alerts are pre-retrieved.
 */
export interface InvokeAttackDiscoveryGraphWithDocsParams {
  /** Pre-retrieved and formatted alert documents (skips retrieval step) */
  anonymizedDocuments: Document[];
  /** Initial replacements map for anonymization */
  replacements?: Replacements;
  /** Callback when new replacements are generated */
  onNewReplacements?: (replacements: Replacements) => void;
}

/**
 * Result from Attack Discovery graph invocation
 */
export interface AttackDiscoveryGraphResult {
  anonymizedDocuments: Document[];
  attackDiscoveries: AttackDiscovery[] | null;
  replacements: Replacements;
}

/**
 * This function will be implemented to invoke the Attack Discovery graph
 * with pre-injected documents, skipping the retrieval step.
 *
 * The actual implementation will come from elastic_assistant's
 * invokeAttackDiscoveryGraph, modified to support this use case.
 */
export type InvokeAttackDiscoveryGraphWithDocs = (
  params: InvokeAttackDiscoveryGraphWithDocsParams
) => Promise<AttackDiscoveryGraphResult>;
