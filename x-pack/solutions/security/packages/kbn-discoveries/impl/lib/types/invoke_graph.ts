/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Document } from '@langchain/core/documents';
import type { AttackDiscovery, Replacements } from '@kbn/elastic-assistant-common';

/**
 * Result from graph invocation
 */
export interface GraphInvocationResult<T = AttackDiscovery> {
  anonymizedDocuments: Document[];
  insights: T[] | null;
  replacements: Replacements;
}

/**
 * Parameters for invoking a graph with pre-retrieved alerts.
 * The graph will skip retrieval because anonymizedDocuments is provided.
 */
export interface InvokeGraphParams {
  /** Pre-retrieved and formatted alert documents */
  anonymizedDocuments: Document[];
  /** Initial replacements map for anonymization */
  replacements?: Replacements;
}
