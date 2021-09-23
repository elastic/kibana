/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { SavedTimeline } from '../../../../plugins/security_solution/common/types/timeline';
import { SavedNote } from '../../../../plugins/security_solution/common/types/timeline/note';

import { FtrProviderContext } from '../../ftr_provider_context';
import { getSavedObjectFromES } from './utils';

interface TimelineWithoutSavedQueryId {
  'siem-ui-timeline': Omit<SavedTimeline, 'savedQueryId'>;
}

interface NoteWithoutTimelineId {
  'siem-ui-timeline-note': Omit<SavedNote, 'timelineId'>;
}

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  describe('Timeline migrations', () => {
    const esArchiver = getService('esArchiver');
    const es = getService('es');

    describe('7.16.0', () => {
      describe('notes timelineId', () => {
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

        it('removes the timelineId in the saved object', async () => {
          const timelines = await getSavedObjectFromES<NoteWithoutTimelineId>(
            es,
            'siem-ui-timeline-note',
            {
              ids: {
                values: [
                  'siem-ui-timeline-note:989002c0-126e-11ec-83d2-db1096c73738',
                  'siem-ui-timeline-note:f09b5980-1271-11ec-83d2-db1096c73738',
                ],
              },
            }
          );

          expect(
            timelines.body.hits.hits[0]._source?.['siem-ui-timeline-note']
          ).to.not.have.property('timelineId');

          expect(
            timelines.body.hits.hits[1]._source?.['siem-ui-timeline-note']
          ).to.not.have.property('timelineId');
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

        it('removes the savedQueryId', async () => {
          const timelines = await getSavedObjectFromES<TimelineWithoutSavedQueryId>(
            es,
            'siem-ui-timeline',
            {
              ids: { values: ['siem-ui-timeline:8dc70950-1012-11ec-9ad3-2d7c6600c0f7'] },
            }
          );

          expect(timelines.body.hits.hits[0]._source?.['siem-ui-timeline']).to.not.have.property(
            'savedQueryId'
          );
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
    });
  });
}
