/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { CreateTimelinesResponse } from '@kbn/security-solution-plugin/common/api/timeline';
import { TIMELINE_EXPORT_URL } from '@kbn/security-solution-plugin/common/constants';
import type TestAgent from 'supertest/lib/agent';
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
import * as users from '../../../../config/privileges/users';
import { roles } from '../../../../config/privileges/roles';

const canOnlyReadUsers = [users.secReadV1User, users.secTimelineReadUser];
const canWriteUsers = [users.secAllV1User, users.secTimelineAllUser];
const canWriteOrReadUsers = [...canOnlyReadUsers, ...canWriteUsers];
const cannotAccessUsers = [users.secNoneV1User, users.secTimelineNoneUser];
const cannotWriteUsers = [...canOnlyReadUsers, ...cannotAccessUsers];

export default function ({ getService }: FtrProviderContextWithSpaces) {
  const utils = getService('securitySolutionUtils');
  const config = getService('config');
  const isServerless = config.get('serverless');
  const isEss = !isServerless;

  const MAX_TIMELINE_EXPORT_IDS = 1000;

  const exportTimeline = async (supertest: TestAgent, ids: string[]) =>
    supertest
      .post(`${TIMELINE_EXPORT_URL}?file_name=timelines_export.ndjson`)
      .set('kbn-xsrf', 'true')
      .set('elastic-api-version', '2023-10-31')
      .send({ ids });

  describe('Timeline privileges', () => {
    before(async () => {
      if (isEss) {
        await Promise.all(
          roles.map((role) => {
            return utils.createRole(role.name, role);
          })
        );
        await Promise.all(
          users.allUsers.map((user) => {
            return utils.createUser(user);
          })
        );
      }
    });
    after(async () => {
      if (isEss) {
        await utils.deleteUsers(users.allUsers.map((user) => user.username));
        await utils.deleteRoles(roles.map((role) => role.name));
      }
    });
    afterEach(async () => {
      await utils.cleanUpCustomRole();
    });

    describe('read timelines', () => {
      canWriteOrReadUsers.forEach((user) => {
        it(`user "${user.username}" can read timelines`, async () => {
          const superTest = await utils.createSuperTestWithUser(user);
          const getTimelinesResponse = await getTimelines(superTest);
          expect(getTimelinesResponse.status).to.be(200);
        });
      });

      cannotAccessUsers.forEach((user) => {
        it(`user "${user.username}" cannot read timelines`, async () => {
          const superTest = await utils.createSuperTestWithUser(user);
          const getTimelinesResponse = await getTimelines(superTest);
          expect(getTimelinesResponse.status).to.be(403);
        });
      });
    });

    describe('resolve timelines', () => {
      let getTimelineId = () => '';
      before(async () => {
        const superTest = await utils.createSuperTestWithUser(users.secTimelineAllUser);
        const {
          body: { savedObjectId },
        } = await createBasicTimeline(superTest, 'test timeline');
        getTimelineId = () => savedObjectId;
      });
      canWriteOrReadUsers.forEach((user) => {
        it(`user "${user.username}" can resolve timelines`, async () => {
          const superTest = await utils.createSuperTestWithUser(user);
          const resolveTimelineResponse = await resolveTimeline(superTest, getTimelineId());
          expect(resolveTimelineResponse.status).to.be(200);
        });
      });

      cannotAccessUsers.forEach((user) => {
        it(`user "${user.username}" cannot resolve timelines`, async () => {
          const superTest = await utils.createSuperTestWithUser(user);
          const resolveTimelineResponse = await resolveTimeline(superTest, getTimelineId());
          expect(resolveTimelineResponse.status).to.be(403);
        });
      });
    });

    describe('export timelines', () => {
      let getTimelineId = () => '';

      before(async () => {
        const superTest = await utils.createSuperTestWithUser(users.secTimelineAllUser);
        const {
          body: { savedObjectId },
        } = await createBasicTimeline(superTest, 'timeline for export');
        getTimelineId = () => savedObjectId;
      });

      canWriteOrReadUsers.forEach((user) => {
        it(`user "${user.username}" can export timelines`, async () => {
          const superTest = await utils.createSuperTestWithUser(user);
          const exportTimelineResponse = await exportTimeline(superTest, [getTimelineId()]);
          expect(exportTimelineResponse.status).to.be(200);
        });
      });

      cannotAccessUsers.forEach((user) => {
        it(`user "${user.username}" cannot export timelines`, async () => {
          const superTest = await utils.createSuperTestWithUser(user);
          const exportTimelineResponse = await exportTimeline(superTest, [getTimelineId()]);
          expect(exportTimelineResponse.status).to.be(403);
        });
      });

      it('rejects export requests above the max ids limit for read users', async () => {
        const superTest = await utils.createSuperTestWithUser(users.secTimelineReadUser);
        const oversizedIds = Array.from(
          { length: MAX_TIMELINE_EXPORT_IDS + 1 },
          (_, index) => `non-existent-timeline-${index}`
        );
        const exportTimelineResponse = await exportTimeline(superTest, oversizedIds);
        expect(exportTimelineResponse.status).to.be(400);
      });

      it('accepts duplicate timeline ids for read users', async () => {
        const superTest = await utils.createSuperTestWithUser(users.secTimelineReadUser);
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
      canWriteUsers.forEach((user) => {
        it(`user "${user.username}" can create and delete timelines`, async () => {
          const superTest = await utils.createSuperTestWithUser(user);

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
          const privilegedSuperTest = await utils.createSuperTestWithUser(users.secTimelineAllUser);
          const {
            body: { savedObjectId: timelineId },
          } = await createBasicTimeline(privilegedSuperTest, 'test timeline');
          getTimelineToDeleteId = () => timelineId;
        });

        cannotWriteUsers.forEach((user) => {
          it(`user "${user.username}" cannot create timelines`, async () => {
            const superTest = await utils.createSuperTestWithUser(user);
            const createResponse = await createBasicTimeline(superTest, 'test timeline');
            expect(createResponse.status).to.be(403);
          });

          it(`user "${user.username}" cannot delete timelines`, async () => {
            const superTest = await utils.createSuperTestWithUser(user);
            const deleteResponse = await deleteTimeline(superTest, getTimelineToDeleteId());
            expect(deleteResponse.status).to.be(403);
          });
        });
      });
    });

    describe('update timelines', () => {
      canWriteUsers.forEach((user) => {
        it(`user "${user.username}" can update timelines`, async () => {
          const superTest = await utils.createSuperTestWithUser(user);
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
          const superTest = await utils.createSuperTestWithUser(users.secTimelineAllUser);
          const {
            body: { savedObjectId, version },
          } = await createBasicTimeline(superTest, 'test timeline');
          getTimelineId = () => savedObjectId;
          getVersion = () => version;
        });
        cannotWriteUsers.forEach((user) => {
          it(`user "${user.username}" cannot create timelines`, async () => {
            const superTest = await utils.createSuperTestWithUser(user);
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
        const superTest = await utils.createSuperTestWithUser(users.secTimelineAllUser);
        const {
          body: { savedObjectId },
        } = await createBasicTimeline(superTest, 'test timeline');
        getTimelineId = () => savedObjectId;
      });
      canWriteUsers.forEach((user) => {
        it(`user "${user.username}" can favorite/unfavorite timelines`, async () => {
          const superTest = await utils.createSuperTestWithUser(user);
          const favoriteTimelineRequest = await favoriteTimeline(superTest, getTimelineId());
          expect(favoriteTimelineRequest.status).to.be(200);
          expect(favoriteTimelineRequest.body.favorite).to.have.length(1);

          // unfavorite
          const unFavoriteTimelineRequest = await favoriteTimeline(superTest, getTimelineId());
          expect(unFavoriteTimelineRequest.status).to.be(200);
          expect(unFavoriteTimelineRequest.body.favorite).to.have.length(0);
        });
      });

      cannotWriteUsers.forEach((user) => {
        it(`user "${user.username}" cannot favorite/unfavorite timelines`, async () => {
          const superTest = await utils.createSuperTestWithUser(user);

          const favoriteTimelineRequest = await favoriteTimeline(superTest, getTimelineId());
          expect(favoriteTimelineRequest.status).to.be(403);
        });
      });
    });

    describe('pin/unpin events', () => {
      let getTimelineId = () => '';
      const eventId = 'anId';
      before(async () => {
        const superTest = await utils.createSuperTestWithUser(users.secTimelineAllUser);
        const {
          body: { savedObjectId },
        } = await createBasicTimeline(superTest, 'test timeline');
        getTimelineId = () => savedObjectId;
      });
      canWriteUsers.forEach((user) => {
        it(`user "${user.username}" can pin/unpin events`, async () => {
          const superTest = await utils.createSuperTestWithUser(user);
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

      cannotWriteUsers.forEach((user) => {
        it(`user "${user.username}" cannot pin/unpin events`, async () => {
          const superTest = await utils.createSuperTestWithUser(user);

          const pinEventResponse = await pinEvent(superTest, getTimelineId(), eventId);
          expect(pinEventResponse.status).to.be(403);
        });
      });
    });

    describe('copy timeline', () => {
      let getTimeline: () => CreateTimelinesResponse = () =>
        ({} as unknown as CreateTimelinesResponse);
      before(async () => {
        const superTest = await utils.createSuperTestWithUser(users.secTimelineAllUser);
        const { body } = await createBasicTimeline(superTest, 'test timeline');
        getTimeline = () => body;
      });
      canWriteUsers.forEach((user) => {
        it(`user "${user.username}" can copy timeline`, async () => {
          const superTest = await utils.createSuperTestWithUser(user);
          const timeline = getTimeline();
          const copyTimelineResponse = await copyTimeline(
            superTest,
            timeline.savedObjectId,
            timeline
          );
          expect(copyTimelineResponse.status).to.be(200);
        });
      });

      cannotWriteUsers.forEach((user) => {
        it(`user "${user.username}" cannot copy timeline`, async () => {
          const superTest = await utils.createSuperTestWithUser(user);
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
      canWriteUsers.forEach((user) => {
        it(`user "${user.username}" can install prepackaged timelines`, async () => {
          const superTest = await utils.createSuperTestWithUser(user);
          const installTimelinesResponse = await installPrepackedTimelines(superTest);
          expect(installTimelinesResponse.status).to.be(200);
        });
      });

      cannotWriteUsers.forEach((user) => {
        it(`user "${user.username}" cannot install prepackaged timelines`, async () => {
          const superTest = await utils.createSuperTestWithUser(user);
          const installTimelinesResponse = await installPrepackedTimelines(superTest);
          expect(installTimelinesResponse.status).to.be(403);
        });
      });
    });
  });
}
