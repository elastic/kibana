/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { DataStreamsStart } from '@kbn/core-data-streams-server';
import {
  DetectionService,
  detectionsDataStream,
  type StoredDetection,
  type detectionsMappings,
} from './detections';
import type { DetectionClient } from './detections';
import { EventService, eventsDataStream, type StoredEvent, type eventsMappings } from './events';
import type { EventClient, RuleEventsClient } from './events';
import type { TriggerEmitter } from '../../workflows/triggers/emit';

export interface SignificantEventsServices {
  detection: DetectionService;
  event: EventService;
}

export interface SignificantEventsClients {
  getDetectionClient: () => Promise<DetectionClient>;
  getEventClient: () => Promise<EventClient>;
  /**
   * Flag-aware accessor for read-only `{id}`/list lookups migrated onto `RuleEventsClient`
   * (currently: `eventsSearchRoute`, `eventsLifecycleRoute`, `eventsGetRoute`,
   * `eventsTriggerInvestigationRoute`). Honors
   * `useRuleEventsRead`. Only call this for handlers that exclusively call `findByEventId` (or
   * the list/search equivalent) — any handler needing `EventClient`-only methods (`bulkCreate`,
   * `findByEventUuid`, `findLatestActive`, `emitTrigger`, …) must keep using `getEventClient()`,
   * which always returns `EventClient` regardless of the flag.
   */
  getEventSearchClient: () => Promise<EventClient | RuleEventsClient>;
}

export function createSignificantEventsServices(): SignificantEventsServices {
  return {
    detection: new DetectionService(),
    event: new EventService(),
  };
}

export function createSignificantEventsClients({
  services,
  dataStreams,
  esClient,
  space,
  triggerEmitter,
  useRuleEventsRead,
}: {
  services: SignificantEventsServices;
  dataStreams: DataStreamsStart;
  esClient: ElasticsearchClient;
  space: string;
  triggerEmitter?: TriggerEmitter;
  /** Gated by `SIGNIFICANT_EVENTS_USE_RULE_EVENTS_READ` (`@kbn/nightshift-shared`). */
  useRuleEventsRead?: boolean;
}): SignificantEventsClients {
  const buildEventClientOptions = async () => ({
    dataStreamClient: await dataStreams.initializeClient<typeof eventsMappings, StoredEvent>(
      eventsDataStream.name
    ),
    esClient,
    space,
    triggerEmitter,
  });

  return {
    getDetectionClient: async () =>
      services.detection.getClient({
        dataStreamClient: await dataStreams.initializeClient<
          typeof detectionsMappings,
          StoredDetection
        >(detectionsDataStream.name),
        esClient,
        space,
      }),
    getEventClient: async () => {
      const eventClientOptions = await buildEventClientOptions();
      // Remaining callers of `getEventClient()` (e.g. `eventsUpdateRoute`, agent-builder tools,
      // workflow triggers, the cleanup job) use the full `EventClient` surface (`bulkCreate`,
      // `findByEventUuid`, `findLatestActive`, `emitTrigger`, …), which `RuleEventsClient`
      // intentionally does not implement (#1517). This accessor always returns `EventClient`,
      // independent of `useRuleEventsRead` — the flag only affects `getEventSearchClient()`.
      return services.event.getClient(eventClientOptions) as EventClient;
    },
    getEventSearchClient: async () => {
      const eventClientOptions = await buildEventClientOptions();
      return services.event.getClient({ ...eventClientOptions, useRuleEventsRead });
    },
  };
}
