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
import type { EventClient, SignificantEventsReadClient } from './events';
import type { TriggerEmitter } from '../../workflows/triggers/emit';

export interface SignificantEventsServices {
  detection: DetectionService;
  event: EventService;
}

export interface SignificantEventsClients {
  getDetectionClient: () => Promise<DetectionClient>;
  getEventClient: () => Promise<EventClient>;
  /**
   * Flag-aware read accessor. Returns `RuleEventsClient` when `SIGNIFICANT_EVENTS_USE_RULE_EVENTS_READ`
   * is on, otherwise returns the shared `EventClient` instance — the same object reference as
   * `getEventClient()`. Callers that need write surface must always use `getEventClient()`.
   */
  getEventSearchClient: () => Promise<SignificantEventsReadClient>;
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

  // Shared EventClient instance — both `getEventClient` and `getEventSearchClient` (when flag is
  // off) return the same object so that `eventSearchClient === eventClient` identity checks in
  // write-path helpers correctly short-circuit the redundant legacy-lineage lookup (#1517).
  // This `let` is declared inside `createSignificantEventsClients` — one closure per request;
  // no cross-request state is shared.
  let sharedEventClient: EventClient | undefined;
  const getSharedEventClient = async (): Promise<EventClient> => {
    if (!sharedEventClient) {
      sharedEventClient = services.event.getClient(await buildEventClientOptions()) as EventClient;
    }
    return sharedEventClient;
  };

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
    // Every caller of `getEventClient()` (routes other than `eventsSearchRoute`, agent-builder
    // tools, workflow triggers) uses the full `EventClient` surface (`bulkCreate`,
    // `findByEventUuid`, `findLatestActive`, `emitTrigger`, …), which `RuleEventsClient`
    // intentionally does not implement (#1517).
    getEventClient: getSharedEventClient,
    getEventSearchClient: async (): Promise<SignificantEventsReadClient> => {
      if (!useRuleEventsRead) {
        // Return the shared EventClient so callers can use `readClient === eventClient` to detect
        // that no synthetic-UUID translation is needed.
        return getSharedEventClient();
      }
      return services.event.getClient({ ...(await buildEventClientOptions()), useRuleEventsRead });
    },
  };
}
