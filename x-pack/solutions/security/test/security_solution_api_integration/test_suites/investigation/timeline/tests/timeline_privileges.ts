/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type TestAgent from 'supertest/lib/agent';
import expect from '@kbn/expect';
import type { CreateTimelinesResponse } from '@kbn/security-solution-plugin/common/api/timeline';
import { TIMELINE_EXPORT_URL } from '@kbn/security-solution-plugin/common/constants';
import type { FtrProviderContextWithSpaces } from '../../../../ftr_provider_context_with_spaces';
import {
  getTimelines,
  createBasicTimeline,
  deleteTimeline,
  patchTimeline,
  favoriteTimeline,
  pinEvent,
  copyTimeline,
  resolveTimeline,
  installPrepackedTimelines,
  unPinEvent,
} from '../../utils/timelines';
import * as roles from '../../../../config/privileges/roles';

const canOnlyReadRoles = [roles.secReadV1, roles.secTimelineReadV2];
const canWriteRoles = [roles.secAllV1, roles.secTimelineAllV2];
const canWriteOrReadRoles = [...canOnlyReadRoles, ...canWriteRoles];
const cannotAccessRoles = [roles.secNoneV1, roles.secTimelineNoneV2];
const cannotWriteRoles = [...canOnlyReadRoles, ...cannotAccessRoles];
const MAX_TIMELINE_EXPORT_IDS = 1000;

export default function ({ getService }: FtrProviderContextWithSpaces) {
  const utils = getService('securitySolutionUtils');
  const supertestCache = new Map<(typeof roles.roles)[number]['name'], TestAgent>();
  const exportTimeline = async (supertest: TestAgent, ids: string[]) =>
    supertest
      .post(`${TIMELINE_EXPORT_URL}?file_name=timelines_export.ndjson`)
      .set('kbn-xsrf', 'true')
      .set('elastic-api-version', '2023-10-31')
      .send({ ids });

  describe('Timeline privileges', () => {
    before(async () => {
      for (const role of roles.roles) {
        supertestCache.set(role.name, await utils.createSuperTestWithCustomRole(role));
      }
    });

    after(async () => {
      await utils.cleanUpCustomRoles();
    });

    describe('read timelines', () => {
      canWriteOrReadRoles.forEach((role) => {
        it(`role "${role.name}" can read timelines`, async () => {
          const superTest = supertestCache.get(role.name)!;
          const getTimelinesResponse = await getTimelines(superTest);
          expect(getTimelinesResponse.status).to.be(200);
        });
      });

      cannotAccessRoles.forEach((role) => {
        it(`role "${role.name}" cannot read timelines`, async () => {
          const superTest = supertestCache.get(role.name)!;
          const getTimelinesResponse = await getTimelines(superTest);
          expect(getTimelinesResponse.status).to.be(403);
        });
      });
    });

    describe('resolve timelines', () => {
      let getTimelineId = () => '';
      before(async () => {
        const superTest = supertestCache.get(roles.secTimelineAllV2.name)!;
        const {
          body: { savedObjectId },
        } = await createBasicTimeline(superTest, 'test timeline');
        getTimelineId = () => savedObjectId;
      });
      canWriteOrReadRoles.forEach((role) => {
        it(`role "${role.name}" can resolve timelines`, async () => {
          const superTest = supertestCache.get(role.name)!;
          const resolveTimelineResponse = await resolveTimeline(superTest, getTimelineId());
          expect(resolveTimelineResponse.status).to.be(200);
        });
      });

      cannotAccessRoles.forEach((role) => {
        it(`role "${role.name}" cannot resolve timelines`, async () => {
          const superTest = supertestCache.get(role.name)!;
          const resolveTimelineResponse = await resolveTimeline(superTest, getTimelineId());
          expect(resolveTimelineResponse.status).to.be(403);
        });
      });
    });

    describe('export timelines', () => {
      let getTimelineId = () => '';

      before(async () => {
        const superTest = supertestCache.get(roles.secTimelineAllV2.name)!;
        const {
          body: { savedObjectId },
        } = await createBasicTimeline(superTest, 'timeline for export');
        getTimelineId = () => savedObjectId;
      });

      canWriteOrReadRoles.forEach((role) => {
        it(`role "${role.name}" can export timelines`, async () => {
          const superTest = supertestCache.get(role.name)!;
          const exportTimelineResponse = await exportTimeline(superTest, [getTimelineId()]);
          expect(exportTimelineResponse.status).to.be(200);
        });
      });

      cannotAccessRoles.forEach((role) => {
        it(`role "${role.name}" cannot export timelines`, async () => {
          const superTest = supertestCache.get(role.name)!;
          const exportTimelineResponse = await exportTimeline(superTest, [getTimelineId()]);
          expect(exportTimelineResponse.status).to.be(403);
        });
      });

      it('rejects export requests above the max ids limit for read roles', async () => {
        const superTest = supertestCache.get(roles.secTimelineReadV2.name)!;
        const oversizedIds = Array.from(
          { length: MAX_TIMELINE_EXPORT_IDS + 1 },
          (_, index) => `non-existent-timeline-${index}`
        );
        const exportTimelineResponse = await exportTimeline(superTest, oversizedIds);
        expect(exportTimelineResponse.status).to.be(400);
      });

      it('accepts duplicate timeline ids for read roles', async () => {
        const superTest = supertestCache.get(roles.secTimelineReadV2.name)!;
        const timelineId = getTimelineId();
        const exportTimelineResponse = await exportTimeline(superTest, [
          timelineId,
          timelineId,
          timelineId,
        ]);
        expect(exportTimelineResponse.status).to.be(200);
      });
    });

    describe('create and delete timelines', () => {
      canWriteRoles.forEach((role) => {
        it(`role "${role.name}" can create and delete timelines`, async () => {
          const superTest = supertestCache.get(role.name)!;

          const createResponse = await createBasicTimeline(superTest, 'test timeline');
          expect(createResponse.status).to.be(200);

          const deleteResponse = await deleteTimeline(superTest, createResponse.body.savedObjectId);
          expect(deleteResponse.status).to.be(200);
        });
      });

      describe('insufficient privileges', () => {
        let getTimelineToDeleteId = () => '';
        before(async () => {
          // create a timeline with a privileged user
          const privilegedSuperTest = supertestCache.get(roles.secTimelineAllV2.name)!;
          const {
            body: { savedObjectId: timelineId },
          } = await createBasicTimeline(privilegedSuperTest, 'test timeline');
          getTimelineToDeleteId = () => timelineId;
        });

        cannotWriteRoles.forEach((role) => {
          it(`role "${role.name}" cannot create timelines`, async () => {
            const superTest = supertestCache.get(role.name)!;
            const createResponse = await createBasicTimeline(superTest, 'test timeline');
            expect(createResponse.status).to.be(403);
          });

          it(`role "${role.name}" cannot delete timelines`, async () => {
            const superTest = supertestCache.get(role.name)!;
            const deleteResponse = await deleteTimeline(superTest, getTimelineToDeleteId());
            expect(deleteResponse.status).to.be(403);
          });
        });
      });
    });

    describe('update timelines', () => {
      canWriteRoles.forEach((role) => {
        it(`role "${role.name}" can update timelines`, async () => {
          const superTest = supertestCache.get(role.name)!;
          const {
            body: { savedObjectId: timelineId, version },
          } = await createBasicTimeline(superTest, 'test timeline');

          await patchTimeline(superTest, timelineId, version, {
            title: 'updated title',
          }).expect(200);
        });
      });

      describe('insufficient privileges', () => {
        let getTimelineId = () => '';
        let getVersion = () => '';
        before(async () => {
          const superTest = supertestCache.get(roles.secTimelineAllV2.name)!;
          const {
            body: { savedObjectId, version },
          } = await createBasicTimeline(superTest, 'test timeline');
          getTimelineId = () => savedObjectId;
          getVersion = () => version;
        });
        cannotWriteRoles.forEach((role) => {
          it(`role "${role.name}" cannot create timelines`, async () => {
            const superTest = supertestCache.get(role.name)!;
            await patchTimeline(superTest, getTimelineId(), getVersion(), {
              title: 'updated title',
            }).expect(403);
          });
        });
      });
    });

    describe('favorite/unfavorite timelines', () => {
      let getTimelineId = () => '';
      before(async () => {
        const superTest = supertestCache.get(roles.secTimelineAllV2.name)!;
        const {
          body: { savedObjectId },
        } = await createBasicTimeline(superTest, 'test timeline');
        getTimelineId = () => savedObjectId;
      });
      canWriteRoles.forEach((role) => {
        it(`role "${role.name}" can favorite/unfavorite timelines`, async () => {
          const superTest = supertestCache.get(role.name)!;
          const favoriteTimelineRequest = await favoriteTimeline(superTest, getTimelineId());
          expect(favoriteTimelineRequest.status).to.be(200);
          expect(favoriteTimelineRequest.body.favorite).to.have.length(1);

          // unfavorite
          const unFavoriteTimelineRequest = await favoriteTimeline(superTest, getTimelineId());
          expect(unFavoriteTimelineRequest.status).to.be(200);
          expect(unFavoriteTimelineRequest.body.favorite).to.have.length(0);
        });
      });

      cannotWriteRoles.forEach((role) => {
        it(`role "${role.name}" cannot favorite/unfavorite timelines`, async () => {
          const superTest = supertestCache.get(role.name)!;

          const favoriteTimelineRequest = await favoriteTimeline(superTest, getTimelineId());
          expect(favoriteTimelineRequest.status).to.be(403);
        });
      });
    });

    describe('pin/unpin events', () => {
      let getTimelineId = () => '';
      const eventId = 'anId';
      before(async () => {
        const superTest = supertestCache.get(roles.secTimelineAllV2.name)!;
        const {
          body: { savedObjectId },
        } = await createBasicTimeline(superTest, 'test timeline');
        getTimelineId = () => savedObjectId;
      });
      canWriteRoles.forEach((role) => {
        it(`role "${role.name}" can pin/unpin events`, async () => {
          const superTest = await utils.createSuperTestWithCustomRole(role);
          const pinEventResponse = await pinEvent(superTest, getTimelineId(), eventId);
          expect(pinEventResponse.status).to.be(200);
          expect('pinnedEventId' in pinEventResponse.body).to.be(true);

          // unpin
          const unPinEventResponse = await unPinEvent(
            superTest,
            getTimelineId(),
            eventId,
            'pinnedEventId' in pinEventResponse.body ? pinEventResponse.body.pinnedEventId : ''
          );
          expect(unPinEventResponse.status).to.be(200);
          expect(unPinEventResponse.body).to.eql({ unpinned: true });
        });
      });

      cannotWriteRoles.forEach((role) => {
        it(`role "${role.name}" cannot pin/unpin events`, async () => {
          const superTest = supertestCache.get(role.name)!;

          const pinEventResponse = await pinEvent(superTest, getTimelineId(), eventId);
          expect(pinEventResponse.status).to.be(403);
        });
      });
    });

    describe('copy timeline', () => {
      let getTimeline: () => CreateTimelinesResponse = () =>
        ({} as unknown as CreateTimelinesResponse);
      before(async () => {
        const superTest = supertestCache.get(roles.secTimelineAllV2.name)!;
        const { body } = await createBasicTimeline(superTest, 'test timeline');
        getTimeline = () => body;
      });
      canWriteRoles.forEach((role) => {
        it(`role "${role.name}" can copy timeline`, async () => {
          const superTest = supertestCache.get(role.name)!;
          const timeline = getTimeline();
          const copyTimelineResponse = await copyTimeline(
            superTest,
            timeline.savedObjectId,
            timeline
          );
          expect(copyTimelineResponse.status).to.be(200);
        });
      });

      cannotWriteRoles.forEach((role) => {
        it(`role "${role.name}" cannot copy timeline`, async () => {
          const superTest = supertestCache.get(role.name)!;
          const timeline = getTimeline();
          const copyTimelineResponse = await copyTimeline(
            superTest,
            timeline.savedObjectId,
            timeline
          );
          expect(copyTimelineResponse.status).to.be(403);
        });
      });
    });

    describe('install prepackaged timelines', () => {
      canWriteRoles.forEach((role) => {
        it(`role "${role.name}" can install prepackaged timelines`, async () => {
          const superTest = supertestCache.get(role.name)!;
          const installTimelinesResponse = await installPrepackedTimelines(superTest);
          expect(installTimelinesResponse.status).to.be(200);
        });
      });

      cannotWriteRoles.forEach((role) => {
        it(`role "${role.name}" cannot install prepackaged timelines`, async () => {
          const superTest = supertestCache.get(role.name)!;
          const installTimelinesResponse = await installPrepackedTimelines(superTest);
          expect(installTimelinesResponse.status).to.be(403);
        });
      });
    });
  });
}
