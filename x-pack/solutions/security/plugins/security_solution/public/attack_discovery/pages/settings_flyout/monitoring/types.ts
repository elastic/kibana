/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type GenerationStatus = 'failed' | 'running' | 'succeeded' | 'unknown';

export interface SourceMetadata {
  action_execution_uuid: string | undefined;
  rule_id: string | undefined;
  rule_name: string | undefined;
}

export interface ActionTriggeredGeneration {
  connector_id: string;
  execution_uuid: string;
  source_metadata: SourceMetadata | null;
  status: GenerationStatus;
  timestamp: string;
}

export interface ActionTriggeredGenerationsResponse {
  data: ActionTriggeredGeneration[];
  total: number;
}
