/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AvailabilityConfig, AvailabilityResult } from '@kbn/agent-builder-server';
import { isInvestigationAvailable } from './is_investigation_available';

type InvestigationAvailabilityDeps = Omit<
  Parameters<typeof isInvestigationAvailable>[0],
  'request' | 'spaceId'
>;

const UNAVAILABLE: AvailabilityResult = {
  status: 'unavailable',
  reason: 'Investigations are not available in this environment.',
} as const;

/**
 * Agent Builder availability for the investigation agent and its tools. Without it these
 * surfaces stay listed after `nightshift.enabled` is turned off: agent documents are persisted,
 * and a registered tool is only filtered out of the catalog when it declares availability.
 *
 * Uses the same check as the investigations client, so a surface is hidden exactly when an
 * investigation cannot be started. Dependencies are read through `getDeps` because the tool is
 * registered at setup while availability is only evaluated once a request arrives.
 */
export const createInvestigationAvailability = ({
  getDeps,
}: {
  getDeps: () => InvestigationAvailabilityDeps | undefined;
}): AvailabilityConfig => ({
  cacheMode: 'none',
  handler: async ({ request, spaceId }) => {
    const deps = getDeps();
    if (!deps) {
      return UNAVAILABLE;
    }

    const available = await isInvestigationAvailable({ ...deps, request, spaceId });
    return available ? { status: 'available' } : UNAVAILABLE;
  },
});
