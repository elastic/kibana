/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CombinedPrompts } from '@kbn/discoveries';

// Stub: real implementation is added by a later PR in the stack. PR2 needs
// this module to exist so the discoveries plugin scaffold's tests can resolve
// the import; the empty return value preserves FF-off prod safety in PR2
// standalone (the consumer is gated behind the workflows FF).
export const getAttackDiscoveryPrompts = async (_params: unknown): Promise<CombinedPrompts> =>
  ({
    default: { default: { user: '', system: '' } },
    refinePrompt: '',
    continuePrompt: '',
  } as unknown as CombinedPrompts);
