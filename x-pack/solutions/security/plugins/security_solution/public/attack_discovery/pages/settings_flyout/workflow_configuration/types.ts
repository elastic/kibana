/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Placeholder — real implementation added in PR 6

export type DefaultAlertRetrievalMode = 'custom_query' | 'disabled' | 'esql' | 'provided';

export interface WorkflowConfiguration {
  alertRetrievalWorkflowIds: string[];
  defaultAlertRetrievalMode: DefaultAlertRetrievalMode;
  esqlQuery?: string;
  validationWorkflowId: string;
}
