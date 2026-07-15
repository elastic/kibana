/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Example } from '@kbn/evals';
import type { PreviewConverseCase } from '../datasets/preview_converse_matrix';

export interface PreviewConverseTaskInput extends Record<string, unknown> {
  prompt: string;
  connectorId: string;
}

export interface PreviewConverseToolResult {
  type?: string;
  data?: Record<string, unknown>;
}

export interface PreviewConverseStep {
  type?: string;
  tool_id?: string;
  params?: Record<string, unknown>;
  results?: PreviewConverseToolResult[];
}

export interface PreviewConverseTaskOutput {
  steps: PreviewConverseStep[];
  message: string;
  previewIds: string[];
  previewAlertCounts: number[];
}

export interface PreviewConverseResponse {
  steps: PreviewConverseStep[];
  message: string;
  traceId?: string;
}

export type PreviewExample = PreviewConverseCase &
  Example<PreviewConverseTaskInput, null, PreviewConverseCase['metadata']>;
