/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Placeholder — real implementation added in PR 4
import type { WorkflowExecutionDto } from '@kbn/workflows';
import type { ParsedApiConfig } from '../types';

export interface ExtractedAlertRetrievalResult {
  alerts: string[];
  alertsContextCount: number;
  apiConfig: ParsedApiConfig;
  replacements: Record<string, string>;
}

export const extractAlertRetrievalResult = (_params: {
  apiConfig: ParsedApiConfig;
  execution: WorkflowExecutionDto;
}): ExtractedAlertRetrievalResult => {
  throw new Error('Not implemented — real implementation added in PR 4');
};
