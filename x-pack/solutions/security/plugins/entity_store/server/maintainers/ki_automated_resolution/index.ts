/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RegisterEntityMaintainerConfig } from '../../tasks/entity_maintainers/types';
import type { EntityStoreCoreSetup } from '../../types';
import { ResolutionClient } from '../../domain/resolution';
import { EntityStoreGlobalStateClient } from '../../domain/saved_objects';
import { createKnowledgeIndicatorsReader } from '../../domain/streams_features';
import type { KiAutomatedResolutionState } from './types';
import { runKiAutomatedResolution } from './run';

const MAINTAINER_ID = 'ki-automated-resolution';

const initialState: KiAutomatedResolutionState = {
  lastRun: null,
};

/**
 * Builds the registration config for the KI entity-resolution maintainer.
 *
 * Registered alongside (never replacing) the email-based `automated-resolution`
 * maintainer, so enabling KI resolution is purely additive. The maintainer is
 * always registered, but each run is **gated at runtime** on the per-space
 * `logsExtraction.useKiEntityResolution` flag — disabled ⇒ immediate no-op,
 * matching the runtime-flag pattern used by the other KI POCs. It needs the
 * `core` setup contract to resolve the Streams Knowledge Indicators reader and
 * to read the global-state config from the maintainer's `fakeRequest`.
 */
export const createKiAutomatedResolutionMaintainerConfig = ({
  core,
}: {
  core: EntityStoreCoreSetup;
}): RegisterEntityMaintainerConfig => ({
  id: MAINTAINER_ID,
  description:
    'Resolves medium-confidence user entities to high-confidence IdP entities using Streams Knowledge Indicators (opt-in)',
  interval: '5m',
  initialState,
  minLicense: 'enterprise',
  run: async ({ status, abortController, logger, esClient, fakeRequest, telemetry }) => {
    const namespace = status.metadata.namespace;
    const state = status.state as KiAutomatedResolutionState;

    const [coreStart] = await core.getStartServices();
    const soClient = coreStart.savedObjects.getScopedClient(fakeRequest);
    const globalStateClient = new EntityStoreGlobalStateClient(soClient, namespace, logger);
    const config = await globalStateClient.find();

    if (!config?.logsExtraction.useKiEntityResolution) {
      logger.debug('KI entity resolution is disabled for this namespace; skipping run');
      return { lastRun: null };
    }

    const reader = await createKnowledgeIndicatorsReader({ core, fakeRequest, logger });
    const resolutionClient = new ResolutionClient({ logger, esClient, namespace });

    return runKiAutomatedResolution({
      state,
      namespace,
      esClient,
      logger,
      resolutionClient,
      reader,
      minConfidence: config.logsExtraction.kiEntityResolutionMinConfidence,
      resolveIdpToIdp: config.logsExtraction.kiEntityResolutionResolveIdpToIdp,
      useRules: config.logsExtraction.kiEntityResolutionUseRules,
      telemetry,
      abortController,
    });
  },
});
