/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import { expect } from '@kbn/scout-oblt/api';
import { tags } from '@kbn/scout-oblt';
import type { ApiClientResponse } from '@kbn/scout-oblt';
import type { BlastRadiusEntry, CausalFeature } from '@kbn/significant-events-schema';
import { significantEventsApiTest as apiTest } from '../../fixtures';
import {
  EVENT_SEARCH_TOOL_ID,
  POLL_OPTIONS,
  TOOL_API_HEADERS,
  executeTool,
} from '../../fixtures/built_in_role_access';
import { deleteSignificantEvent, seedSignificantEvent } from '../../fixtures/rule_events';

const RUN_ID = uuidv4();
/** The id under test. It is placed on a different topology field in each matching event. */
const FEATURE_ID = `topology-feature-${RUN_ID}`;
/** Present on the dependency rows so a source or target match is not also a feature_id match. */
const DEPENDENCY_FEATURE_ID = `topology-dependency-${RUN_ID}`;
/** Present only on the control event, which the feature id under test must not return. */
const CONTROL_FEATURE_ID = `topology-control-${RUN_ID}`;

interface SeededTopologyEvent {
  eventId: string;
  matchesFeature: boolean;
  data: {
    causal_features?: CausalFeature[];
    blast_radius?: BlastRadiusEntry[];
  };
}

const SEEDED_EVENTS: SeededTopologyEvent[] = [
  {
    eventId: `topology-causal-${RUN_ID}`,
    matchesFeature: true,
    data: { causal_features: [{ feature_id: FEATURE_ID, name: 'Checkout' }] },
  },
  {
    eventId: `topology-blast-${RUN_ID}`,
    matchesFeature: true,
    data: {
      blast_radius: [{ type: 'entity', feature_id: FEATURE_ID, name: 'Checkout' }],
    },
  },
  {
    eventId: `topology-source-${RUN_ID}`,
    matchesFeature: true,
    data: {
      blast_radius: [
        {
          type: 'dependency',
          feature_id: DEPENDENCY_FEATURE_ID,
          source: FEATURE_ID,
          target: `topology-downstream-${RUN_ID}`,
        },
      ],
    },
  },
  {
    eventId: `topology-target-${RUN_ID}`,
    matchesFeature: true,
    data: {
      blast_radius: [
        {
          type: 'dependency',
          feature_id: DEPENDENCY_FEATURE_ID,
          source: `topology-upstream-${RUN_ID}`,
          target: FEATURE_ID,
        },
      ],
    },
  },
  {
    eventId: `topology-control-${RUN_ID}`,
    matchesFeature: false,
    data: {
      causal_features: [{ feature_id: CONTROL_FEATURE_ID, name: 'Other' }],
      blast_radius: [
        {
          type: 'dependency',
          feature_id: CONTROL_FEATURE_ID,
          source: `topology-control-source-${RUN_ID}`,
          target: `topology-control-target-${RUN_ID}`,
        },
      ],
    },
  },
];

const MATCHING_EVENT_IDS = SEEDED_EVENTS.filter(({ matchesFeature }) => matchesFeature)
  .map(({ eventId }) => eventId)
  .sort();

const searchedEventIds = (response: ApiClientResponse): string[] => {
  const events = response.body.results?.[0]?.data?.events ?? [];
  return events.map(({ event_id: eventId }: { event_id: string }) => eventId).sort();
};

apiTest.describe(
  'Significant Events topology search',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    let headers: Record<string, string>;

    apiTest.beforeAll(async ({ esClient, requestAuth }) => {
      const { apiKeyHeader } = await requestAuth.loginAsStreamsAdmin();
      headers = { ...TOOL_API_HEADERS, ...apiKeyHeader };
      for (const event of SEEDED_EVENTS) {
        await seedSignificantEvent(esClient, event.eventId, {
          title: 'Topology filter check',
          summary: 'Seeded to check topology feature matching.',
          confidence: 0.5,
          ...event.data,
        });
      }
    });

    apiTest.afterAll(async ({ esClient }) => {
      await Promise.all(
        SEEDED_EVENTS.map(({ eventId }) => deleteSignificantEvent(esClient, eventId))
      );
    });

    apiTest(
      'matches a feature id on causal features, blast radius, and dependency endpoints',
      async ({ apiClient }) => {
        const eventIds = SEEDED_EVENTS.map(({ eventId }) => eventId);
        const search = (topologyFeatureIds: string[]) =>
          executeTool(apiClient, headers, EVENT_SEARCH_TOOL_ID, {
            topology_feature_ids: topologyFeatureIds,
            event_ids: eventIds,
            status: 'active',
          });

        await expect
          .poll(async () => {
            const response = await search([FEATURE_ID]);
            return {
              statusCode: response.statusCode,
              type: response.body.results?.[0]?.type,
              message: response.body.results?.[0]?.data?.message,
              eventIds: searchedEventIds(response),
            };
          }, POLL_OPTIONS)
          .toStrictEqual({
            statusCode: 200,
            type: 'other',
            message: undefined,
            eventIds: MATCHING_EVENT_IDS,
          });

        const control = await search([CONTROL_FEATURE_ID]);
        expect(control).toHaveStatusCode(200);
        expect(control.body.results?.[0]?.type).toBe('other');
        expect(searchedEventIds(control)).toStrictEqual([`topology-control-${RUN_ID}`]);
      }
    );
  }
);
