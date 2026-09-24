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
   * Flag-aware accessor for `eventsSearchRoute` (the list/count/pagination endpoint) — the only
   * caller migrated onto `RuleEventsClient` so far (nightshift-program#1516). Honors
   * `useRuleEventsRead`; every other caller must keep using `getEventClient()`, which always
   * returns `EventClient` regardless of the flag.
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
      // Every caller of `getEventClient()` (routes other than `eventsSearchRoute`, agent-builder
      // tools, workflow triggers) uses the full `EventClient` surface (`bulkCreate`,
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
