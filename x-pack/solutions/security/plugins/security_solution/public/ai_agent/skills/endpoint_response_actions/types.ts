/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type ActionType = 'isolate' | 'unisolate';

export interface HostRef {
  hostName: string;
  agentId: string;
  isIsolated: boolean;
}

export interface ActionIntent {
  type: ActionType;
  hostName: string;
}

export interface ActionResult {
  actionId: string;
  status: 'pending' | 'completed' | 'failed';
  errorMessage?: string;
  timestamp: string;
}
