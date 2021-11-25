/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import {
  noteSavedObjectType,
  pinnedEventSavedObjectType,
  timelineSavedObjectType,
} from '../../../../plugins/security_solution/server/lib/timeline/saved_object_mappings';
import { TimelineWithoutExternalRefs } from '../../../../plugins/security_solution/common/types/timeline';
import { NoteWithoutExternalRefs } from '../../../../plugins/security_solution/common/types/timeline/note';

import { FtrProviderContext } from '../../ftr_provider_context';
import { getSavedObjectFromES } from './utils';
import { PinnedEventWithoutExternalRefs } from '../../../../plugins/security_solution/common/types/timeline/pinned_event';

interface TimelineWithoutSavedQueryId {
  [timelineSavedObjectType]: TimelineWithoutExternalRefs;
}

interface NoteWithoutTimelineId {
  [noteSavedObjectType]: NoteWithoutExternalRefs;
}

interface PinnedEventWithoutTimelineId {
  [pinnedEventSavedObjectType]: PinnedEventWithoutExternalRefs;
}

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  describe('Timeline migrations', () => {
    const esArchiver = getService('esArchiver');
    const es = getService('es');

    describe('8.0 id migration', () => {
      const resolveWithSpaceApi = '/s/awesome-space/api/timeline/resolve';

      before(async () => {
        await esArchiver.load(
          'x-pack/test/functional/es_archives/security_solution/timelines/7.15.0_space'
        );
      });

      after(async () => {
        await esArchiver.unload(
          'x-pack/test/functional/es_archives/security_solution/timelines/7.15.0_space'
        );
      });

      describe('resolve', () => {
        it('should return an aliasMatch outcome', async () => {
          const resp = await supertest
            .get(resolveWithSpaceApi)
            .query({ id: '1e2e9850-25f8-11ec-a981-b77847c6ef30' });

          expect(resp.body.data.outcome).to.be('aliasMatch');
          expect(resp.body.data.alias_target_id).to.not.be(undefined);
          expect(resp.body.data.timeline.title).to.be('An awesome timeline');
        });

        describe('notes', () => {
          it('should return the notes with the correct eventId', async () => {
            const resp = await supertest
              .get(resolveWithSpaceApi)
              .query({ id: '1e2e9850-25f8-11ec-a981-b77847c6ef30' });

            expect(resp.body.data.timeline.notes[0].eventId).to.be('StU_UXwBAowmaxx6YdiS');
          });

          it('should return notes with the timelineId matching the resolved timeline id', async () => {
            const resp = await supertest
              .get(resolveWithSpaceApi)
              .query({ id: '1e2e9850-25f8-11ec-a981-b77847c6ef30' });

            expect(resp.body.data.timeline.notes[0].timelineId).to.be(
              resp.body.data.timeline.savedObjectId
            );
            expect(resp.body.data.timeline.notes[1].timelineId).to.be(
              resp.body.data.timeline.savedObjectId
            );
          });
        });

        describe('pinned events', () => {
          it('should pinned events with eventId', async () => {
            const resp = await supertest
              .get(resolveWithSpaceApi)
              .query({ id: '1e2e9850-25f8-11ec-a981-b77847c6ef30' });

            expect(resp.body.data.timeline.pinnedEventsSaveObject[0].eventId).to.be(
              'StU_UXwBAowmaxx6YdiS'
            );
          });

          it('should return pinned events with the timelineId matching request id', async () => {
            const resp = await supertest
              .get(resolveWithSpaceApi)
              .query({ id: '1e2e9850-25f8-11ec-a981-b77847c6ef30' });

            expect(resp.body.data.timeline.pinnedEventsSaveObject[0].timelineId).to.be(
              resp.body.data.timeline.savedObjectId
            );
          });
        });
      });
    });

    describe('7.16.0', () => {
      before(async () => {
        await esArchiver.load(
          'x-pack/test/functional/es_archives/security_solution/timelines/7.15.0'
        );
      });

      after(async () => {
        await esArchiver.unload(
          'x-pack/test/functional/es_archives/security_solution/timelines/7.15.0'
        );
      });
      describe('notes timelineId', () => {
        it('removes the timelineId in the saved object', async () => {
          const timelines = await getSavedObjectFromES<NoteWithoutTimelineId>(
            es,
            noteSavedObjectType,
            {
              ids: {
                values: [
                  'siem-ui-timeline-note:989002c0-126e-11ec-83d2-db1096c73738',
                  'siem-ui-timeline-note:f09b5980-1271-11ec-83d2-db1096c73738',
                ],
              },
            }
          );

          expect(timelines.body.hits.hits[0]._source?.[noteSavedObjectType]).to.not.have.property(
            'timelineId'
          );

          expect(timelines.body.hits.hits[1]._source?.[noteSavedObjectType]).to.not.have.property(
            'timelineId'
          );
        });

        it('preserves the eventId in the saved object after migration', async () => {
          const resp = await supertest
            .get('/api/timeline')
            .query({ id: '6484cc90-126e-11ec-83d2-db1096c73738' });

          expect(resp.body.data.getOneTimeline.notes[0].eventId).to.be('Edo00XsBEVtyvU-8LGNe');
        });

        it('returns the timelineId in the response', async () => {
          const resp = await supertest
            .get('/api/timeline')
            .query({ id: '6484cc90-126e-11ec-83d2-db1096c73738' });

          expect(resp.body.data.getOneTimeline.notes[0].timelineId).to.be(
            '6484cc90-126e-11ec-83d2-db1096c73738'
          );
          expect(resp.body.data.getOneTimeline.notes[1].timelineId).to.be(
            '6484cc90-126e-11ec-83d2-db1096c73738'
          );
        });
      });

      describe('savedQueryId', () => {
        it('removes the savedQueryId', async () => {
          const timelines = await getSavedObjectFromES<TimelineWithoutSavedQueryId>(
            es,
            timelineSavedObjectType,
            {
              ids: { values: ['siem-ui-timeline:8dc70950-1012-11ec-9ad3-2d7c6600c0f7'] },
            }
          );

          expect(
            timelines.body.hits.hits[0]._source?.[timelineSavedObjectType]
          ).to.not.have.property('savedQueryId');
        });

        it('preserves the title in the saved object after migration', async () => {
          const resp = await supertest
            .get('/api/timeline')
            .query({ id: '8dc70950-1012-11ec-9ad3-2d7c6600c0f7' });

          expect(resp.body.data.getOneTimeline.title).to.be('Awesome Timeline');
        });

        it('returns the savedQueryId in the response', async () => {
          const resp = await supertest
            .get('/api/timeline')
            .query({ id: '8dc70950-1012-11ec-9ad3-2d7c6600c0f7' });

          expect(resp.body.data.getOneTimeline.savedQueryId).to.be("It's me");
        });
      });
      describe('pinned events timelineId', () => {
        it('removes the timelineId in the saved object', async () => {
          const timelines = await getSavedObjectFromES<PinnedEventWithoutTimelineId>(
            es,
            pinnedEventSavedObjectType,
            {
              ids: {
                values: [
                  'siem-ui-timeline-pinned-event:7a9a5540-126e-11ec-83d2-db1096c73738',
                  'siem-ui-timeline-pinned-event:98d919b0-126e-11ec-83d2-db1096c73738',
                ],
              },
            }
          );

          expect(
            timelines.body.hits.hits[0]._source?.[pinnedEventSavedObjectType]
          ).to.not.have.property('timelineId');

          expect(
            timelines.body.hits.hits[1]._source?.[pinnedEventSavedObjectType]
          ).to.not.have.property('timelineId');
        });

        it('preserves the eventId in the saved object after migration', async () => {
          const resp = await supertest
            .get('/api/timeline')
            .query({ id: '6484cc90-126e-11ec-83d2-db1096c73738' });

          expect(resp.body.data.getOneTimeline.pinnedEventsSaveObject[0].eventId).to.be(
            'DNo00XsBEVtyvU-8LGNe'
          );
          expect(resp.body.data.getOneTimeline.pinnedEventsSaveObject[1].eventId).to.be(
            'Edo00XsBEVtyvU-8LGNe'
          );
        });

        it('returns the timelineId in the response', async () => {
          const resp = await supertest
            .get('/api/timeline')
            .query({ id: '6484cc90-126e-11ec-83d2-db1096c73738' });

          expect(resp.body.data.getOneTimeline.pinnedEventsSaveObject[0].timelineId).to.be(
            '6484cc90-126e-11ec-83d2-db1096c73738'
          );
          expect(resp.body.data.getOneTimeline.pinnedEventsSaveObject[1].timelineId).to.be(
            '6484cc90-126e-11ec-83d2-db1096c73738'
          );
        });
      });
    });
  });
}
