/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';

// Stub: real implementation is added by a later PR in the stack. PR2's plugin
// scaffold needs this module to exist so plugin.ts can import it; the no-op
// preserves FF-off prod safety in PR2 standalone (no skills get registered).
export const registerSkills = (
  _agentBuilder: unknown,
  _logger: Logger,
  _params: Record<string, unknown>
): void => {
  // no-op stub; replaced by the real implementation in a later PR
};
