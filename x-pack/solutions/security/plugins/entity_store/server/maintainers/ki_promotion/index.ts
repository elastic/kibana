/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RegisterEntityMaintainerConfig } from '../../tasks/entity_maintainers/types';
import type { EntityStoreCoreSetup } from '../../types';
import { createKnowledgeIndicatorsReader } from '../../domain/streams_features';
import { EntityStoreGlobalStateClient } from '../../domain/saved_objects';
import { ENTITY_STORE_KI_PROMOTION_EVENT, createReportEvent } from '../../telemetry/events';
import { runKiPromotion } from './run';
import { INITIAL_STATE, type KiPromotionState } from './types';

const MAINTAINER_ID = 'ki-promotion';

/**
 * Build the KI promotion maintainer config bound to the plugin's
 * `core` setup. The factory pattern mirrors `createKiRelationshipsMaintainerConfig`:
 * we need `core.getStartServices()` to resolve both the streams plugin's
 * KI reader and the SO client used by the global-state client, and
 * `core` is only available inside the plugin's `setup()` lifecycle.
 *
 * Interval default: 15m. The maintainer's eligibility signal comes from
 * KI features extracted by the generic task — those change at LLM-
 * extraction cadence (minutes-to-hours), so a faster maintainer interval
 * would mostly re-evaluate the same candidate set. 15m matches
 * `ki-relationships`, keeping operators' mental model consistent across
 * the KI-derived maintainers.
 *
 * License gate: `enterprise`. Promotion writes to `host.id` / `service.name`
 * via `entity.EngineMetadata.Type` retypes and is the first non-user
 * writer of `entity.confidence`; both are surfaces consumed by the
 * enterprise-only entity graph / attack discovery flows.
 */
export const createKiPromotionMaintainerConfig = (
  core: EntityStoreCoreSetup
): RegisterEntityMaintainerConfig => ({
  id: MAINTAINER_ID,
  description:
    "Promotes Streams-derived KI entities from generic to host/service engines when confidence and identity-field shape allow.",
  interval: '15m',
  initialState: INITIAL_STATE,
  minLicense: 'enterprise',
  run: async ({ status, abortController, logger, esClient, fakeRequest }) => {
    const namespace = status.metadata.namespace;
    const previous = status.state as KiPromotionState;
    void previous;

    const [coreStart] = await core.getStartServices();
    const soClient = coreStart.savedObjects.getScopedClient(fakeRequest);
    const globalStateClient = new EntityStoreGlobalStateClient(soClient, namespace, logger);

    const reader = await createKnowledgeIndicatorsReader({ core, fakeRequest, logger });

    const lastRun = await runKiPromotion({
      reader,
      esClient,
      logger,
      namespace,
      abortController,
      globalStateClient,
    });

    // Per-maintainer telemetry is emitted on every completed run (the
    // framework's generic `ENTITY_MAINTAINER_EVENT` covers run / abort /
    // error in addition to this). Pattern matches `extract_entity_task`'s
    // `ENTITY_STORE_KI_LOOP_EVENT` emission: only on the success branch.
    const telemetryReporter = createReportEvent(core.analytics);
    telemetryReporter.reportEvent(ENTITY_STORE_KI_PROMOTION_EVENT, {
      namespace,
      ...lastRun,
    });

    const next: KiPromotionState = {
      lastRun,
      lastRunTimestamp: new Date().toISOString(),
    };
    return next;
  },
});
