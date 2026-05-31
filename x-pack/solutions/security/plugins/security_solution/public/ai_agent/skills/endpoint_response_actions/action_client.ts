/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionType, ActionResult } from './types';
import { MAX_POLL_DURATION_MS, POLL_INTERVAL_MS } from './constants';

interface ExecuteOptions {
  actionType: ActionType;
  agentId: string;
}

export async function executeAction(options: ExecuteOptions): Promise<{ actionId: string }> {
  // TODO: call Response Actions API
  throw new Error('Not implemented');
}

export async function pollActionStatus(
  actionId: string,
  timeoutMs = MAX_POLL_DURATION_MS
): Promise<ActionResult> {
  // TODO: poll status every POLL_INTERVAL_MS until timeout
  throw new Error('Not implemented');
}
