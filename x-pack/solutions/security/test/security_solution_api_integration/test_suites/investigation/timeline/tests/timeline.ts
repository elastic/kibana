/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { TimelineTypeEnum } from '@kbn/security-solution-plugin/common/api/timeline';
import type TestAgent from 'supertest/lib/agent';
import type { FtrProviderContextWithSpaces } from '../../../../ftr_provider_context_with_spaces';
import {
  createBasicTimeline,
  createBasicTimelineTemplate,
  getTimelines,
  resolveTimeline,
} from '../../utils/timelines';

const EXACT_MATCH_TIMELINE_ID = '8dc70950-1012-11ec-9ad3-2d7c6600c0f7';
const TIMELINE_WITH_NOTES_ID = '6484cc90-126e-11ec-83d2-db1096c73738';
const NOTE_WITH_EVENT_ID = '989002c0-126e-11ec-83d2-db1096c73738';
const NOTE_WITHOUT_EVENT_ID = 'f09b5980-1271-11ec-83d2-db1096c73738';
const PINNED_EVENT_ID_1 = '7a9a5540-126e-11ec-83d2-db1096c73738';
const PINNED_EVENT_ID_2 = '98d919b0-126e-11ec-83d2-db1096c73738';

export default function ({ getService }: FtrProviderContextWithSpaces) {
  const utils = getService('securitySolutionUtils');
  const kibanaServer = getService('kibanaServer');
  let supertest: TestAgent;

  describe('Timeline', () => {
    before(async () => (supertest = await utils.createSuperTest()));

    describe('timelines', () => {
      it('Make sure that we get Timeline data', async () => {
        const titleToSaved = 'hello timeline';
        await createBasicTimeline(supertest, titleToSaved);

        const {
          body: { timeline: timelines },
        } = await getTimelines(supertest);

        expect(timelines.length).to.greaterThan(0);
      });

      it('Make sure that pagination is working in Timeline query', async () => {
        const titleToSaved = 'hello timeline';
        await createBasicTimeline(supertest, titleToSaved);

        const {
          body: { timeline: timelines },
        } = await getTimelines(supertest, { page_size: '1', page_index: '1' });

        expect(timelines.length).to.equal(1);
      });

      it('Make sure that we get Timeline template data', async () => {
        const titleToSaved = 'hello timeline template';
        await createBasicTimelineTemplate(supertest, titleToSaved);

        const {
          body: { timeline: templates },
        } = await getTimelines(supertest, { timeline_type: 'template' });

        expect(templates.length).to.greaterThan(0);
        expect(
          templates.filter((t) => t.timelineType === TimelineTypeEnum.default).length
        ).to.equal(0);
      });
    });

    describe('@skipInServerless resolve timeline', () => {
      before(async () => {
        // Kibana 9.x refuses to migrate pre-8.18 `.kibana_1` archives via esArchiver
        // (see timeline_migrations_8_0_id.test.ts). Seed the post-migration state directly
        // instead, mirroring resolve_read_rules.ts.
        const timelineReference = {
          id: TIMELINE_WITH_NOTES_ID,
          name: 'timelineId',
          type: 'siem-ui-timeline',
        };

        await kibanaServer.savedObjects.create({
          type: 'siem-ui-timeline',
          id: EXACT_MATCH_TIMELINE_ID,
          overwrite: true,
          attributes: {
            title: 'Awesome Timeline',
          },
        });

        await kibanaServer.savedObjects.create({
          type: 'siem-ui-timeline',
          id: TIMELINE_WITH_NOTES_ID,
          overwrite: true,
          attributes: {
            title: 'timeline with pinned events',
          },
        });

        await kibanaServer.savedObjects.create({
          type: 'siem-ui-timeline-note',
          id: NOTE_WITH_EVENT_ID,
          overwrite: true,
          attributes: {
            eventId: 'Edo00XsBEVtyvU-8LGNe',
            note: 'A comment on an event',
          },
          references: [timelineReference],
        });

        await kibanaServer.savedObjects.create({
          type: 'siem-ui-timeline-note',
          id: NOTE_WITHOUT_EVENT_ID,
          overwrite: true,
          attributes: {
            note: 'a non pin comment',
          },
          references: [timelineReference],
        });

        await kibanaServer.savedObjects.create({
          type: 'siem-ui-timeline-pinned-event',
          id: PINNED_EVENT_ID_1,
          overwrite: true,
          attributes: {
            eventId: 'DNo00XsBEVtyvU-8LGNe',
          },
          references: [timelineReference],
        });

        await kibanaServer.savedObjects.create({
          type: 'siem-ui-timeline-pinned-event',
          id: PINNED_EVENT_ID_2,
          overwrite: true,
          attributes: {
            eventId: 'Edo00XsBEVtyvU-8LGNe',
          },
          references: [timelineReference],
        });
      });

      after(async () => {
        for (const { type, id } of [
          { type: 'siem-ui-timeline-pinned-event', id: PINNED_EVENT_ID_1 },
          { type: 'siem-ui-timeline-pinned-event', id: PINNED_EVENT_ID_2 },
          { type: 'siem-ui-timeline-note', id: NOTE_WITH_EVENT_ID },
          { type: 'siem-ui-timeline-note', id: NOTE_WITHOUT_EVENT_ID },
          { type: 'siem-ui-timeline', id: TIMELINE_WITH_NOTES_ID },
          { type: 'siem-ui-timeline', id: EXACT_MATCH_TIMELINE_ID },
        ]) {
          await kibanaServer.savedObjects.delete({ type, id }).catch(() => undefined);
        }
      });

      it('should return outcome exactMatch when the id is unchanged', async () => {
        const resp = await resolveTimeline(supertest, EXACT_MATCH_TIMELINE_ID);
        expect(resp.body.outcome).to.be('exactMatch');
        expect(resp.body.alias_target_id).to.be(undefined);
        expect(resp.body.timeline.title).to.be('Awesome Timeline');
      });

      describe('notes', () => {
        it('should return notes with eventId', async () => {
          const resp = await resolveTimeline(supertest, TIMELINE_WITH_NOTES_ID);
          expect(resp.body.timeline.notes![0].eventId).to.be('Edo00XsBEVtyvU-8LGNe');
        });

        it('should return notes with the timelineId matching request id', async () => {
          const resp = await resolveTimeline(supertest, TIMELINE_WITH_NOTES_ID);

          expect(resp.body.timeline.notes![0].timelineId).to.be(TIMELINE_WITH_NOTES_ID);
          expect(resp.body.timeline.notes![1].timelineId).to.be(TIMELINE_WITH_NOTES_ID);
        });
      });

      describe('pinned events', () => {
        it('should pinned events with eventId', async () => {
          const resp = await resolveTimeline(supertest, TIMELINE_WITH_NOTES_ID);

          expect(resp.body.timeline.pinnedEventsSaveObject![0].eventId).to.be(
            'DNo00XsBEVtyvU-8LGNe'
          );
          expect(resp.body.timeline.pinnedEventsSaveObject![1].eventId).to.be(
            'Edo00XsBEVtyvU-8LGNe'
          );
        });

        it('should return pinned events with the timelineId matching request id', async () => {
          const resp = await resolveTimeline(supertest, TIMELINE_WITH_NOTES_ID);

          expect(resp.body.timeline.pinnedEventsSaveObject![0].timelineId).to.be(
            TIMELINE_WITH_NOTES_ID
          );
          expect(resp.body.timeline.pinnedEventsSaveObject![1].timelineId).to.be(
            TIMELINE_WITH_NOTES_ID
          );
        });
      });
    });
  });
};
