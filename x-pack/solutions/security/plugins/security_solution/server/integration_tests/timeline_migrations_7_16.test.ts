/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import Path from 'path';

import {
  createTestServers,
  getSupertest,
  type TestElasticsearchUtils,
  type TestKibanaUtils,
} from '@kbn/core-test-helpers-kbn-server';
import { ALL_SAVED_OBJECT_INDICES } from '@kbn/core-saved-objects-server';
import {
  noteSavedObjectType,
  pinnedEventSavedObjectType,
  timelineSavedObjectType,
} from '../lib/timeline/saved_object_mappings';

const TIMELINE_URL = '/api/timeline';

const logFilePath = Path.join(__dirname, 'timeline_migrations_7_16.log');

const TIMELINE_WITH_SAVED_QUERY_ID = '8dc70950-1012-11ec-9ad3-2d7c6600c0f7';
const TIMELINE_WITH_NOTES_AND_PINS = '6484cc90-126e-11ec-83d2-db1096c73738';

interface TimelineResponse {
  title?: string;
  savedQueryId?: string;
  notes?: Array<{ eventId?: string; timelineId?: string }>;
  pinnedEventsSaveObject?: Array<{ eventId?: string; timelineId?: string }>;
}

describe('Timeline saved-object migrations — 7.16', () => {
  let esServer: TestElasticsearchUtils;
  let kibanaServer: TestKibanaUtils;

  beforeAll(async () => {
    const { startES, startKibana } = createTestServers({
      adjustTimeout: (t) => jest.setTimeout(t),
      settings: {
        es: { license: 'trial' },
        kbn: {
          logging: {
            appenders: {
              file: {
                type: 'file',
                fileName: logFilePath,
                layout: { type: 'json' },
              },
            },
            root: { level: 'warn' },
          },
          cliArgs: { oss: false },
        },
      },
    });

    esServer = await startES();
    kibanaServer = await startKibana();

    // Seed saved objects with pre-7.16 attributes so the migration framework
    // runs the 7.16.0 migration functions (migrateTimelineIdToReferences /
    // migrateSavedQueryIdToReferences) when Kibana processes the documents.
    const soRepo = kibanaServer.coreStart.savedObjects.createInternalRepository();

    await soRepo.create(
      timelineSavedObjectType,
      { title: 'Awesome Timeline', savedQueryId: "It's me" },
      { id: TIMELINE_WITH_SAVED_QUERY_ID, migrationVersion: {}, overwrite: true }
    );

    await soRepo.create(
      timelineSavedObjectType,
      { title: 'timeline with pinned events' },
      { id: TIMELINE_WITH_NOTES_AND_PINS, migrationVersion: {}, overwrite: true }
    );

    // Notes with pre-migration timelineId in attributes
    await soRepo.create(
      noteSavedObjectType,
      {
        eventId: 'Edo00XsBEVtyvU-8LGNe',
        note: 'A comment on an event',
        timelineId: TIMELINE_WITH_NOTES_AND_PINS,
      },
      {
        id: '989002c0-126e-11ec-83d2-db1096c73738',
        migrationVersion: {},
        overwrite: true,
      }
    );

    await soRepo.create(
      noteSavedObjectType,
      { note: 'a non pin comment', timelineId: TIMELINE_WITH_NOTES_AND_PINS },
      {
        id: 'f09b5980-1271-11ec-83d2-db1096c73738',
        migrationVersion: {},
        overwrite: true,
      }
    );

    // Pinned events with pre-migration timelineId in attributes
    await soRepo.create(
      pinnedEventSavedObjectType,
      { eventId: 'DNo00XsBEVtyvU-8LGNe', timelineId: TIMELINE_WITH_NOTES_AND_PINS },
      {
        id: '7a9a5540-126e-11ec-83d2-db1096c73738',
        migrationVersion: {},
        overwrite: true,
      }
    );

    await soRepo.create(
      pinnedEventSavedObjectType,
      { eventId: 'Edo00XsBEVtyvU-8LGNe', timelineId: TIMELINE_WITH_NOTES_AND_PINS },
      {
        id: '98d919b0-126e-11ec-83d2-db1096c73738',
        migrationVersion: {},
        overwrite: true,
      }
    );
  });

  afterAll(async () => {
    await kibanaServer?.stop();
    await esServer?.stop();
  });

  describe('notes timelineId', () => {
    it('removes timelineId from note saved-object attributes', async () => {
      const esClient = esServer.es.getClient();
      const result = await esClient.search({
        index: ALL_SAVED_OBJECT_INDICES,
        ignore_unavailable: true,
        query: {
          bool: {
            filter: [
              {
                ids: {
                  values: [
                    'siem-ui-timeline-note:989002c0-126e-11ec-83d2-db1096c73738',
                    'siem-ui-timeline-note:f09b5980-1271-11ec-83d2-db1096c73738',
                  ],
                },
              },
              { term: { type: { value: noteSavedObjectType } } },
            ],
          },
        },
      });

      expect(result.hits.hits).toHaveLength(2);
      for (const hit of result.hits.hits) {
        const source = hit._source as Record<string, unknown>;
        const noteAttrs = source[noteSavedObjectType] as Record<string, unknown> | undefined;
        expect(noteAttrs).toBeDefined();
        expect(Object.prototype.hasOwnProperty.call(noteAttrs, 'timelineId')).toBe(false);
      }
    });

    it('preserves eventId in note attributes', async () => {
      const esClient = esServer.es.getClient();
      const result = await esClient.search({
        index: ALL_SAVED_OBJECT_INDICES,
        ignore_unavailable: true,
        query: {
          bool: {
            filter: [
              {
                ids: {
                  values: ['siem-ui-timeline-note:989002c0-126e-11ec-83d2-db1096c73738'],
                },
              },
              { term: { type: { value: noteSavedObjectType } } },
            ],
          },
        },
      });

      expect(result.hits.hits).toHaveLength(1);
      const source = result.hits.hits[0]._source as Record<string, unknown>;
      const noteAttrs = source[noteSavedObjectType] as Record<string, unknown> | undefined;
      expect((noteAttrs as { eventId?: string })?.eventId).toBe('Edo00XsBEVtyvU-8LGNe');
    });

    it('returns timelineId and eventId in timeline GET response', async () => {
      const response = await getSupertest(kibanaServer.root, 'get', TIMELINE_URL)
        .query({ id: TIMELINE_WITH_NOTES_AND_PINS })
        .expect(200);

      const body = response.body as TimelineResponse;
      expect(body.notes?.some((n) => n.eventId === 'Edo00XsBEVtyvU-8LGNe')).toBe(true);
      expect(body.notes?.every((n) => n.timelineId === TIMELINE_WITH_NOTES_AND_PINS)).toBe(true);
    });
  });

  describe('pinned events timelineId', () => {
    it('removes timelineId from pinned-event saved-object attributes', async () => {
      const esClient = esServer.es.getClient();
      const result = await esClient.search({
        index: ALL_SAVED_OBJECT_INDICES,
        ignore_unavailable: true,
        query: {
          bool: {
            filter: [
              {
                ids: {
                  values: [
                    'siem-ui-timeline-pinned-event:7a9a5540-126e-11ec-83d2-db1096c73738',
                    'siem-ui-timeline-pinned-event:98d919b0-126e-11ec-83d2-db1096c73738',
                  ],
                },
              },
              { term: { type: { value: pinnedEventSavedObjectType } } },
            ],
          },
        },
      });

      expect(result.hits.hits).toHaveLength(2);
      for (const hit of result.hits.hits) {
        const source = hit._source as Record<string, unknown>;
        const pinnedAttrs = source[pinnedEventSavedObjectType] as
          | Record<string, unknown>
          | undefined;
        expect(pinnedAttrs).toBeDefined();
        expect(Object.prototype.hasOwnProperty.call(pinnedAttrs, 'timelineId')).toBe(false);
      }
    });

    it('returns pinned-event eventId and timelineId in timeline GET response', async () => {
      const response = await getSupertest(kibanaServer.root, 'get', TIMELINE_URL)
        .query({ id: TIMELINE_WITH_NOTES_AND_PINS })
        .expect(200);

      const body = response.body as TimelineResponse;
      const eventIds = body.pinnedEventsSaveObject?.map((p) => p.eventId);
      expect(eventIds).toEqual(
        expect.arrayContaining(['DNo00XsBEVtyvU-8LGNe', 'Edo00XsBEVtyvU-8LGNe'])
      );
      expect(
        body.pinnedEventsSaveObject?.every((p) => p.timelineId === TIMELINE_WITH_NOTES_AND_PINS)
      ).toBe(true);
    });
  });

  describe('savedQueryId', () => {
    it('removes savedQueryId from timeline saved-object attributes', async () => {
      const esClient = esServer.es.getClient();
      const result = await esClient.search({
        index: ALL_SAVED_OBJECT_INDICES,
        ignore_unavailable: true,
        query: {
          bool: {
            filter: [
              {
                ids: { values: [`siem-ui-timeline:${TIMELINE_WITH_SAVED_QUERY_ID}`] },
              },
              { term: { type: { value: timelineSavedObjectType } } },
            ],
          },
        },
      });

      expect(result.hits.hits).toHaveLength(1);
      const source = result.hits.hits[0]._source as Record<string, unknown>;
      const timelineAttrs = source[timelineSavedObjectType] as Record<string, unknown> | undefined;
      expect(timelineAttrs).toBeDefined();
      expect(Object.prototype.hasOwnProperty.call(timelineAttrs, 'savedQueryId')).toBe(false);
    });

    it('returns savedQueryId and title in timeline GET response', async () => {
      const response = await getSupertest(kibanaServer.root, 'get', TIMELINE_URL)
        .query({ id: TIMELINE_WITH_SAVED_QUERY_ID })
        .expect(200);

      const body = response.body as TimelineResponse;
      expect(body.title).toBe('Awesome Timeline');
      expect(body.savedQueryId).toBe("It's me");
    });
  });
});
