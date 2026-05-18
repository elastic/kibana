/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RegisterEntityMaintainerConfig } from '../../tasks/entity_maintainers/types';
import type { EntityStoreCoreSetup } from '../../types';
import { createKnowledgeIndicatorsReader } from '../../domain/streams_features';
import { runKiRelationships } from './run';
import { INITIAL_STATE, type KiRelationshipsState } from './types';

const MAINTAINER_ID = 'ki-relationships';

/**
 * Build the KI relationship maintainer config bound to the plugin's
 * `core` setup. We use a factory rather than a static const because the
 * maintainer needs `core.getStartServices()` to resolve the streams
 * plugin's request-scoped Knowledge Indicators reader, and `core` is
 * only available inside the plugin's `setup()` lifecycle.
 *
 * Interval default: 15m. Dependencies are derived from features that
 * change at LLM-extraction cadence (typically minutes-to-hours), so a
 * faster interval would mostly re-write the same edges. Operators can
 * override this if they need fresher graphs (e.g. during incident
 * response) by configuring the maintainer registry directly — the field
 * is part of `RegisterEntityMaintainerConfig`.
 */
export const createKiRelationshipsMaintainerConfig = (
  core: EntityStoreCoreSetup
): RegisterEntityMaintainerConfig => ({
  id: MAINTAINER_ID,
  description:
    'Materializes entity relationships from Streams dependency Knowledge Indicators (depends_on, communicates_with).',
  interval: '15m',
  initialState: INITIAL_STATE,
  // The maintainer is gated to enterprise to mirror automated_resolution.
  // Both write into `entity.relationships` and produce graph-shaped data
  // that downstream UIs (entity graph, attack discovery) consume.
  minLicense: 'enterprise',
  run: async ({ status, abortController, logger, esClient, fakeRequest }) => {
    const namespace = status.metadata.namespace;
    const previous = status.state as KiRelationshipsState;

    const reader = await createKnowledgeIndicatorsReader({ core, fakeRequest, logger });

    const lastRun = await runKiRelationships({
      reader,
      esClient,
      logger,
      namespace,
      abortController,
    });

    const next: KiRelationshipsState = {
      lastRun,
      lastRunTimestamp: new Date().toISOString(),
    };

    // `previous.lastRun` is intentionally not merged in; we report only
    // the most recent run's metrics on the maintainer status. The task
    // framework already tracks `runs` (count), `lastSuccessTimestamp`
    // and `lastErrorTimestamp` in `EntityMaintainerStatusMetadata`, so
    // historical context is available without us preserving it here.
    void previous;
    return next;
  },
});
