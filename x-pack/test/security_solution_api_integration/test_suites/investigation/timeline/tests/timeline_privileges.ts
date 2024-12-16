/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContextWithSpaces } from '../../../../ftr_provider_context_with_spaces';
import {
  getTimelines,
  createBasicTimeline,
  deleteTimeline,
  patchTimeline,
} from '../../utils/timelines';
import * as users from '../privileges/users';
import { roles } from '../privileges/roles';

const canOnlyReadUsers = [users.secReadV1User, users.secTimelineReadUser];
const canWriteUsers = [users.secAllV1User, users.secTimelineAllUser];
const canWriteOrReadUsers = [...canOnlyReadUsers, ...canWriteUsers];
const cannotAccessUsers = [users.secNoneV1User, users.secTimelineNoneUser];

export default function ({ getService }: FtrProviderContextWithSpaces) {
  const utils = getService('securitySolutionUtils');

  describe('Timeline privileges', () => {
    before(async () => {
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
    });
    after(async () => {
      await utils.deleteUsers(users.allUsers.map((user) => user.username));
      await utils.deleteRoles(roles.map((role) => role.name));
    });

    describe('read timelines', () => {
      canWriteOrReadUsers.forEach((user) => {
        it(`user "${user.username}" can read timelines`, async () => {
          const superTest = await utils.createSuperTest(user.username, user.password);
          const { status } = await getTimelines(superTest);
          expect(status).to.be(200);
        });
      });

      cannotAccessUsers.forEach((user) => {
        it(`user "${user.username}" cannot read timelines`, async () => {
          const superTest = await utils.createSuperTest(user.username, user.password);
          const { status } = await getTimelines(superTest);
          expect(status).to.be(403);
        });
      });
    });

    describe('create and delete timelines', () => {
      canWriteUsers.forEach((user) => {
        it(`user "${user.username}" can create and delete timelines`, async () => {
          const superTest = await utils.createSuperTest(user.username, user.password);

          const createResponse = await createBasicTimeline(superTest, 'test timeline');
          expect(createResponse.status).to.be(200);

          const deleteResponse = await deleteTimeline(superTest, createResponse.body.savedObjectId);
          expect(deleteResponse.status).to.be(200);
        });
      });

      [...canOnlyReadUsers, ...cannotAccessUsers].forEach((user) => {
        it(`user "${user.username}" cannot create timelines`, async () => {
          const superTest = await utils.createSuperTest(user.username, user.password);

          const createResponse = await createBasicTimeline(superTest, 'test timeline');
          expect(createResponse.status).to.be(403);
        });

        it(`user "${user.username}" cannot delete timelines`, async () => {
          // create a timeline with a privileged user
          const privilegedSuperTest = await utils.createSuperTest(
            users.secTimelineAllUser.username,
            users.secTimelineAllUser.password
          );
          const createResponse = await createBasicTimeline(privilegedSuperTest, 'test timeline');

          // try to delete that timeline with a user that has insufficient privileges
          const superTest = await utils.createSuperTest(user.username, user.password);
          const deleteResponse = await deleteTimeline(superTest, createResponse.body.savedObjectId);
          expect(deleteResponse.status).to.be(403);
        });
      });
    });

    describe('update timelines', () => {
      canWriteUsers.forEach((user) => {
        it(`user "${user.username}" can update timelines`, async () => {
          const superTest = await utils.createSuperTest(user.username, user.password);
          const {
            body: { savedObjectId: timelineId, version },
          } = await createBasicTimeline(superTest, 'test timeline');

          const patchResponse = await patchTimeline(superTest, timelineId, version, {
            title: 'updated title',
          });
          expect(patchResponse.status).to.be(200);
        });
      });

      [...canOnlyReadUsers, ...cannotAccessUsers].forEach((user) => {
        it(`user "${user.username}" cannot create timelines`, async () => {
          // create a timeline with a privileged user
          const privilegedSuperTest = await utils.createSuperTest(
            users.secTimelineAllUser.username,
            users.secTimelineAllUser.password
          );
          const {
            body: { savedObjectId: timelineId, version },
          } = await createBasicTimeline(privilegedSuperTest, 'test timeline');

          const superTest = await utils.createSuperTest(user.username, user.password);
          const patchResponse = await patchTimeline(superTest, timelineId, version, {
            title: 'updated title',
          });
          expect(patchResponse.status).to.be(403);
        });
      });
    });
  });
}
