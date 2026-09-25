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
import type { EventClient } from './events';
import type { TriggerEmitter } from '../../workflows/triggers/emit';

export interface SignificantEventsServices {
  detection: DetectionService;
  event: EventService;
}

export interface SignificantEventsClients {
  getDetectionClient: () => Promise<DetectionClient>;
  getEventClient: () => Promise<EventClient>;
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
      // `EventService.getClient()` returns `EventClient | RuleEventsClient`, but every current
      // caller of `getEventClient()` (routes, agent-builder tools, workflow triggers) still uses
      // the full `EventClient` surface (`bulkCreate`, `findByEventUuid`, `findLatestActive`,
      // `emitTrigger`, …), which `RuleEventsClient` intentionally does not implement (#1517).
      // `useRuleEventsRead` is gated behind those sibling reader PRs migrating each call site —
      // unlike `EventService.getClient()`'s own `false` default (a code-level fallback),
      // `useRuleEventsRead` here is sourced from a *live* feature flag (see `plugin.ts`), so it can
      // flip without a deploy. Guard loudly instead of silently casting: a `TypeError` on the first
      // `.bulkCreate()`/`.emitTrigger()`/etc. call would be much harder to trace back to this flag.
      if (useRuleEventsRead) {
        throw new Error(
          'SIGNIFICANT_EVENTS_USE_RULE_EVENTS_READ is not yet safe for getEventClient() callers: ' +
            'RuleEventsClient does not implement bulkCreate, emitTrigger, findByEventUuid, or ' +
            'findLatestActive. Do not enable this flag before nightshift-program#1516/#1517 land.'
        );
      }
      return services.event.getClient({
        dataStreamClient: await dataStreams.initializeClient<typeof eventsMappings, StoredEvent>(
          eventsDataStream.name
        ),
        esClient,
        space,
        triggerEmitter,
        useRuleEventsRead,
      }) as EventClient;
    },
  };
}
