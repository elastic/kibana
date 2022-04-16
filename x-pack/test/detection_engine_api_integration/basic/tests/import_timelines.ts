/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { TIMELINE_IMPORT_URL } from '@kbn/security-solution-plugin/common/constants';

import { FtrProviderContext } from '../../common/ftr_provider_context';
import { deleteAllTimelines } from '../../utils';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const es = getService('es');

  describe('import timelines', () => {
    describe('creating a timeline', () => {
      const getTimeline = () => {
        return Buffer.from(
          JSON.stringify({
            savedObjectId: '67664480-d191-11ea-ae67-4f4be8c1847b',
            version: 'WzU1NSwxXQ==',
            columns: [
              {
                indexes: null,
                name: null,
                columnHeaderType: 'not-filtered',
                id: '@timestamp',
                searchable: null,
              },
              {
                indexes: null,
                name: null,
                columnHeaderType: 'not-filtered',
                id: 'message',
                searchable: null,
              },
              {
                indexes: null,
                name: null,
                columnHeaderType: 'not-filtered',
                id: 'event.category',
                searchable: null,
              },
              {
                indexes: null,
                name: null,
                columnHeaderType: 'not-filtered',
                id: 'event.action',
                searchable: null,
              },
              {
                indexes: null,
                name: null,
                columnHeaderType: 'not-filtered',
                id: 'host.name',
                searchable: null,
              },
              {
                indexes: null,
                name: null,
                columnHeaderType: 'not-filtered',
                id: 'source.ip',
                searchable: null,
              },
              {
                indexes: null,
                name: null,
                columnHeaderType: 'not-filtered',
                id: 'destination.ip',
                searchable: null,
              },
              {
                indexes: null,
                name: null,
                columnHeaderType: 'not-filtered',
                id: 'user.name',
                searchable: null,
              },
            ],
            dataProviders: [],
            description: '',
            eventType: 'all',
            filters: [],
            kqlMode: 'filter',
            timelineType: 'default',
            kqlQuery: {
              filterQuery: {
                serializedQuery:
                  '{"bool":{"should":[{"exists":{"field":"@timestamp"}}],"minimum_should_match":1}}',
                kuery: {
                  expression: '@timestamp : * ',
                  kind: 'kuery',
                },
              },
            },
            title: 'x2',
            sort: {
              columnId: '@timestamp',
              sortDirection: 'desc',
            },
            created: 1596036895488,
            createdBy: 'angela',
            updated: 1596491470411,
            updatedBy: 'elastic',
            templateTimelineId: null,
            templateTimelineVersion: null,
            dateRange: {
              start: '2020-04-10T14:10:58.373Z',
              end: '2020-05-30T14:16:58.373Z',
            },
            savedQueryId: null,
            eventNotes: [
              {
                noteId: '7d875ba0-d5d3-11ea-9899-ebec3d084fe0',
                version: 'WzU1NiwxXQ==',
                eventId: '8KtMKnIBOS_moQ_K9fAe',
                note: 'hi Xavier',
                timelineId: '67664480-d191-11ea-ae67-4f4be8c1847b',
                created: 1596491490806,
                createdBy: 'elastic',
                updated: 1596491490806,
                updatedBy: 'elastic',
              },
            ],
            globalNotes: [],
            pinnedEventIds: [
              'K99zy3EBDTDlbwBfpf6x',
              'GKpFKnIBOS_moQ_Ke5AO',
              '8KtMKnIBOS_moQ_K9fAe',
            ],
          })
        );
      };
      beforeEach(async () => {});

      afterEach(async () => {
        await deleteAllTimelines(es);
      });

      it("if it doesn't exists", async () => {
        const { body } = await supertest
          .post(`${TIMELINE_IMPORT_URL}`)
          .set('kbn-xsrf', 'true')
          .attach('file', getTimeline(), 'timelines.ndjson')
          .expect(200);
        expect(body).to.eql({
          errors: [],
          success: true,
          success_count: 1,
          timelines_installed: 1,
          timelines_updated: 0,
        });
      });
    });

    describe('creating a timeline template', () => {
      const getTimelineTemplate = () => {
        return Buffer.from(
          JSON.stringify({
            savedObjectId: 'cab434d0-d26c-11ea-b887-3b103296472a',
            version: 'WzQ0NSwxXQ==',
            columns: [
              {
                indexes: null,
                name: null,
                columnHeaderType: 'not-filtered',
                id: '@timestamp',
                searchable: null,
              },
              {
                indexes: null,
                name: null,
                columnHeaderType: 'not-filtered',
                id: 'message',
                searchable: null,
              },
              {
                indexes: null,
                name: null,
                columnHeaderType: 'not-filtered',
                id: 'event.category',
                searchable: null,
              },
              {
                indexes: null,
                name: null,
                columnHeaderType: 'not-filtered',
                id: 'event.action',
                searchable: null,
              },
              {
                indexes: null,
                name: null,
                columnHeaderType: 'not-filtered',
                id: 'host.name',
                searchable: null,
              },
              {
                indexes: null,
                name: null,
                columnHeaderType: 'not-filtered',
                id: 'source.ip',
                searchable: null,
              },
              {
                indexes: null,
                name: null,
                columnHeaderType: 'not-filtered',
                id: 'destination.ip',
                searchable: null,
              },
              {
                indexes: null,
                name: null,
                columnHeaderType: 'not-filtered',
                id: 'user.name',
                searchable: null,
              },
            ],
            dataProviders: [],
            description: 'desc',
            eventType: 'all',
            filters: [],
            kqlMode: 'filter',
            timelineType: 'template',
            kqlQuery: { filterQuery: null },
            title: 'my t template',
            sort: { columnId: '@timestamp', sortDirection: 'desc' },
            templateTimelineId: '46a50505-0a48-49cb-9ab2-d15d683efa3b',
            templateTimelineVersion: 1,
            created: 1596473742379,
            createdBy: 'elastic',
            updated: 1596473909169,
            updatedBy: 'elastic',
            dateRange: { start: '2020-08-02T16:55:22.160Z', end: '2020-08-03T16:55:22.161Z' },
            savedQueryId: null,
            eventNotes: [],
            globalNotes: [
              {
                noteId: '358f45c0-d5aa-11ea-9b6d-53d136d390dc',
                version: 'WzQzOCwxXQ==',
                note: 'I have a global note',
                timelineId: 'cab434d0-d26c-11ea-b887-3b103296472a',
                created: 1596473760688,
                createdBy: 'elastic',
                updated: 1596473760688,
                updatedBy: 'elastic',
              },
            ],
            pinnedEventIds: [],
          })
        );
      };

      afterEach(async () => {
        await deleteAllTimelines(es);
      });

      it("if it doesn't exists", async () => {
        const { body } = await supertest
          .post(`${TIMELINE_IMPORT_URL}`)
          .set('kbn-xsrf', 'true')
          .attach('file', getTimelineTemplate(), 'timelines.ndjson')
          .expect(200);
        expect(body).to.eql({
          errors: [],
          success: true,
          success_count: 1,
          timelines_installed: 1,
          timelines_updated: 0,
        });
      });
    });

    describe('Updating a timeline template', () => {
      const getTimelineTemplate = (templateTimelineVersion: number) => {
        return Buffer.from(
          JSON.stringify({
            savedObjectId: 'cab434d0-d26c-11ea-b887-3b103296472a',
            version: 'WzQ0NSwxXQ==',
            columns: [
              {
                indexes: null,
                name: null,
                columnHeaderType: 'not-filtered',
                id: '@timestamp',
                searchable: null,
              },
              {
                indexes: null,
                name: null,
                columnHeaderType: 'not-filtered',
                id: 'message',
                searchable: null,
              },
              {
                indexes: null,
                name: null,
                columnHeaderType: 'not-filtered',
                id: 'event.category',
                searchable: null,
              },
              {
                indexes: null,
                name: null,
                columnHeaderType: 'not-filtered',
                id: 'event.action',
                searchable: null,
              },
              {
                indexes: null,
                name: null,
                columnHeaderType: 'not-filtered',
                id: 'host.name',
                searchable: null,
              },
              {
                indexes: null,
                name: null,
                columnHeaderType: 'not-filtered',
                id: 'source.ip',
                searchable: null,
              },
              {
                indexes: null,
                name: null,
                columnHeaderType: 'not-filtered',
                id: 'destination.ip',
                searchable: null,
              },
              {
                indexes: null,
                name: null,
                columnHeaderType: 'not-filtered',
                id: 'user.name',
                searchable: null,
              },
            ],
            dataProviders: [],
            description: 'desc',
            eventType: 'all',
            filters: [],
            kqlMode: 'filter',
            timelineType: 'template',
            kqlQuery: { filterQuery: null },
            title: 'my t template',
            sort: { columnId: '@timestamp', sortDirection: 'desc' },
            templateTimelineId: '46a50505-0a48-49cb-9ab2-d15d683efa3b',
            templateTimelineVersion,
            created: 1596473742379,
            createdBy: 'elastic',
            updated: 1596473909169,
            updatedBy: 'elastic',
            dateRange: { start: '2020-08-02T16:55:22.160Z', end: '2020-08-03T16:55:22.161Z' },
            savedQueryId: null,
            eventNotes: [],
            globalNotes: [
              {
                noteId: '358f45c0-d5aa-11ea-9b6d-53d136d390dc',
                version: 'WzQzOCwxXQ==',
                note: 'I have a global note',
                timelineId: 'cab434d0-d26c-11ea-b887-3b103296472a',
                created: 1596473760688,
                createdBy: 'elastic',
                updated: 1596473760688,
                updatedBy: 'elastic',
              },
            ],
            pinnedEventIds: [],
          })
        );
      };

      afterEach(async () => {
        await deleteAllTimelines(es);
      });

      it("if it doesn't exists", async () => {
        await supertest
          .post(`${TIMELINE_IMPORT_URL}`)
          .set('kbn-xsrf', 'true')
          .attach('file', getTimelineTemplate(1), 'timelines.ndjson')
          .expect(200);
        const { body } = await supertest
          .post(`${TIMELINE_IMPORT_URL}`)
          .set('kbn-xsrf', 'true')
          .attach('file', getTimelineTemplate(2), 'timelines.ndjson')
          .expect(200);
        expect(body).to.eql({
          errors: [],
          success: true,
          success_count: 1,
          timelines_installed: 0,
          timelines_updated: 1,
        });
      });
    });
  });
};
