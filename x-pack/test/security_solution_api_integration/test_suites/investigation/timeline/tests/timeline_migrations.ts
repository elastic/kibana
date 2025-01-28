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
} from '@kbn/security-solution-plugin/server/lib/timeline/saved_object_mappings';
import {
  BareNoteWithoutExternalRefs,
  BarePinnedEventWithoutExternalRefs,
  TimelineWithoutExternalRefs,
} from '@kbn/security-solution-plugin/common/api/timeline';
import { TIMELINE_URL } from '@kbn/security-solution-plugin/common/constants';
import TestAgent from 'supertest/lib/agent';
import type { FtrProviderContextWithSpaces } from '../../../../ftr_provider_context_with_spaces';
import { getSavedObjectFromES } from '../../../utils';

interface TimelineWithoutSavedQueryId {
  [timelineSavedObjectType]: TimelineWithoutExternalRefs;
}

interface NoteWithoutTimelineId {
  [noteSavedObjectType]: BareNoteWithoutExternalRefs;
}

interface PinnedEventWithoutTimelineId {
  [pinnedEventSavedObjectType]: BarePinnedEventWithoutExternalRefs;
}

export default function ({ getService }: FtrProviderContextWithSpaces) {
  const utils = getService('securitySolutionUtils');
  let supertest: TestAgent;

  describe('@skipInServerless Timeline migrations', () => {
    before(async () => {
      supertest = await utils.createSuperTest();
    });

    const esArchiver = getService('esArchiver');
    const es = getService('es');
    const kibanaServer = getService('kibanaServer');
    const spacesService = getService('spaces');

    describe('8.0 id migration', () => {
      const resolveWithSpaceApi = '/s/awesome-space/api/timeline/resolve';

      before(async () => {
        await esArchiver.load(
          'x-pack/test/functional/es_archives/security_solution/timelines/7.15.0_space'
        );
        await kibanaServer.importExport.load(
          'x-pack/test/functional/fixtures/kbn_archiver/security_solution/timelines/7.15.0_space',
          { space: 'awesome-space' }
        );
      });

      after(async () => await spacesService.delete('awesome-space'));

      describe('resolve', () => {
        it('should return an aliasMatch outcome', async () => {
          const resp = await supertest
            .get(resolveWithSpaceApi)
            .query({ id: '1e2e9850-25f8-11ec-a981-b77847c6ef30' });

          expect(resp.body.outcome).to.be('aliasMatch');
          expect(resp.body.alias_target_id).to.not.be(undefined);
          expect(resp.body.timeline.title).to.be('An awesome timeline');
        });

        describe('notes', () => {
          it('should return the notes with the correct eventId', async () => {
            const resp = await supertest
              .get(resolveWithSpaceApi)
              .query({ id: '1e2e9850-25f8-11ec-a981-b77847c6ef30' });

            expect(resp.body.timeline.notes[0].eventId).to.be('StU_UXwBAowmaxx6YdiS');
          });

          it('should return notes with the timelineId matching the resolved timeline id', async () => {
            const resp = await supertest
              .get(resolveWithSpaceApi)
              .query({ id: '1e2e9850-25f8-11ec-a981-b77847c6ef30' });

            expect(resp.body.timeline.notes[0].timelineId).to.be(resp.body.timeline.savedObjectId);
            expect(resp.body.timeline.notes[1].timelineId).to.be(resp.body.timeline.savedObjectId);
          });
        });

        describe('pinned events', () => {
          it('should pinned events with eventId', async () => {
            const resp = await supertest
              .get(resolveWithSpaceApi)
              .query({ id: '1e2e9850-25f8-11ec-a981-b77847c6ef30' });

            expect(resp.body.timeline.pinnedEventsSaveObject[0].eventId).to.be(
              'StU_UXwBAowmaxx6YdiS'
            );
          });

          it('should return pinned events with the timelineId matching request id', async () => {
            const resp = await supertest
              .get(resolveWithSpaceApi)
              .query({ id: '1e2e9850-25f8-11ec-a981-b77847c6ef30' });

            expect(resp.body.timeline.pinnedEventsSaveObject[0].timelineId).to.be(
              resp.body.timeline.savedObjectId
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
            .get(TIMELINE_URL)
            .query({ id: '6484cc90-126e-11ec-83d2-db1096c73738' });

          expect(resp.body.notes[0].eventId).to.be('Edo00XsBEVtyvU-8LGNe');
        });

        it('returns the timelineId in the response', async () => {
          const resp = await supertest
            .get(TIMELINE_URL)
            .query({ id: '6484cc90-126e-11ec-83d2-db1096c73738' });

          expect(resp.body.notes[0].timelineId).to.be('6484cc90-126e-11ec-83d2-db1096c73738');
          expect(resp.body.notes[1].timelineId).to.be('6484cc90-126e-11ec-83d2-db1096c73738');
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
            .get(TIMELINE_URL)
            .query({ id: '8dc70950-1012-11ec-9ad3-2d7c6600c0f7' });

          expect(resp.body.title).to.be('Awesome Timeline');
        });

        it('returns the savedQueryId in the response', async () => {
          const resp = await supertest
            .get(TIMELINE_URL)
            .query({ id: '8dc70950-1012-11ec-9ad3-2d7c6600c0f7' });

          expect(resp.body.savedQueryId).to.be("It's me");
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
            .get(TIMELINE_URL)
            .query({ id: '6484cc90-126e-11ec-83d2-db1096c73738' });

          expect(resp.body.pinnedEventsSaveObject[0].eventId).to.be('DNo00XsBEVtyvU-8LGNe');
          expect(resp.body.pinnedEventsSaveObject[1].eventId).to.be('Edo00XsBEVtyvU-8LGNe');
        });

        it('returns the timelineId in the response', async () => {
          const resp = await supertest
            .get(TIMELINE_URL)
            .query({ id: '6484cc90-126e-11ec-83d2-db1096c73738' });

          expect(resp.body.pinnedEventsSaveObject[0].timelineId).to.be(
            '6484cc90-126e-11ec-83d2-db1096c73738'
          );
          expect(resp.body.pinnedEventsSaveObject[1].timelineId).to.be(
            '6484cc90-126e-11ec-83d2-db1096c73738'
          );
        });
      });
    });
  });
}
