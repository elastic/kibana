/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RegisterEntityMaintainerConfig } from '../../tasks/entity_maintainers/types';
import { ResolutionClient } from '../../domain/resolution';
import type { AutomatedResolutionState } from './types';
import { runAutomatedResolution } from './run';

const MAINTAINER_ID = 'automated-resolution';

const initialState: AutomatedResolutionState = {
  lastProcessedTimestamp: null,
  lastRun: null,
};

/**
 * @param parallelResolutionEnabled Static boolean: when true, the maintainer
 *   queries `entity.relationships.resolution.by_rule.resolved_to` for the
 *   "already-resolved" check (instead of the legacy single-slot field) and
 *   stamps the `by_rule` provenance slot on every link via
 *   `linkEntities({ source: 'rule' })`. Mutually exclusive with
 *   `getParallelResolutionEnabled`. Wired from the
 *   `entityAnalyticsParallelResolution` experimental flag.
 * @param getParallelResolutionEnabled Late-bound version of
 *   `parallelResolutionEnabled` — invoked once per maintainer run so the
 *   plugin can flip the toggle without re-registering. Used by
 *   `EntityStoreSetupContract.setParallelResolutionEnabled`.
 */
export function createAutomatedResolutionMaintainerConfig({
  parallelResolutionEnabled = false,
  getParallelResolutionEnabled,
}: {
  parallelResolutionEnabled?: boolean;
  getParallelResolutionEnabled?: () => boolean;
} = {}): RegisterEntityMaintainerConfig {
  const isStaticParallel = getParallelResolutionEnabled === undefined;
  return {
    id: MAINTAINER_ID,
    description:
      isStaticParallel && parallelResolutionEnabled
        ? 'Automatically resolves entities using field-matching rules (parallel: by_rule slot)'
        : 'Automatically resolves entities using field-matching rules',
    interval: '5m',
    initialState,
    minLicense: 'enterprise',
    run: async ({ status, abortController, logger, esClient }) => {
      const namespace = status.metadata.namespace;
      const state = status.state as AutomatedResolutionState;
      const resolutionClient = new ResolutionClient({ logger, esClient, namespace });
      const enabled = getParallelResolutionEnabled
        ? getParallelResolutionEnabled()
        : parallelResolutionEnabled;

      return runAutomatedResolution({
        state,
        namespace,
        esClient,
        logger,
        resolutionClient,
        abortController,
        parallelResolutionEnabled: enabled,
      });
    },
  };
}

/**
 * Back-compat export — retains the original constant name for callers that
 * predate the parallel-resolution flag. Equivalent to
 * `createAutomatedResolutionMaintainerConfig()` (parallel mode disabled).
 */
export const automatedResolutionMaintainerConfig: RegisterEntityMaintainerConfig =
  createAutomatedResolutionMaintainerConfig();
