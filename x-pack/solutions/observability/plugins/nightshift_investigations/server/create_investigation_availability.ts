/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AvailabilityConfig, AvailabilityResult } from '@kbn/agent-builder-server';
import {
  isInvestigationInfrastructureAvailable,
  type InvestigationInfrastructureAvailabilityDependencies,
} from './is_investigation_available';

type InvestigationAvailabilityDeps = Omit<
  InvestigationInfrastructureAvailabilityDependencies,
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
 * This checks infrastructure only. Model availability is evaluated per run, so an explicit model
 * can still start an investigation when the code-owned default is unavailable.
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

    const available = await isInvestigationInfrastructureAvailable({ ...deps, request, spaceId });
    return available ? { status: 'available' } : UNAVAILABLE;
  },
});
