/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionsClient } from '../../tools/sandbox_bash/agent_connectors';
import type { AlertOutcomeSource, IdentityProposal, ResolveResult } from '../types';

export interface AdapterContext {
  actionsClient: Pick<ActionsClient, 'get' | 'execute'>;
}

/** Deterministic, read-only access to one alert source. Adapters never call an LLM. */
export interface ProviderAdapter {
  source: AlertOutcomeSource;
  /** Must resolve exactly one alert instance that was active when the post arrived. */
  resolve(
    proposal: IdentityProposal,
    timing: { postReceivedAt: string },
    context: AdapterContext
  ): Promise<ResolveResult>;
}
