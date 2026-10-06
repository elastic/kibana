/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { EventClient } from './event_client';
import type { EventDataStreamClient } from './event_client';
import { RuleEventsClient } from './rule_events_client';
import type { TriggerEmitter } from '../../../workflows/triggers/emit';

export class EventService {
  getClient({
    dataStreamClient,
    esClient,
    space,
    triggerEmitter,
    useRuleEventsRead = false,
  }: {
    dataStreamClient: EventDataStreamClient;
    esClient: ElasticsearchClient;
    space: string;
    triggerEmitter?: TriggerEmitter;
    /** Gated by `SIGNIFICANT_EVENTS_USE_RULE_EVENTS_READ` (`@kbn/nightshift-shared`). */
    useRuleEventsRead?: boolean;
  }): EventClient | RuleEventsClient {
    if (useRuleEventsRead) {
      return new RuleEventsClient({ esClient, space });
    }
    return new EventClient({
      dataStreamClient,
      esClient,
      space,
      triggerEmitter,
    });
  }
}
