/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContextWithSpaces } from '../../../../ftr_provider_context_with_spaces';
import { createNote, deleteNote, getNote } from '../../utils/notes';
import * as users from '../privileges/users';
import { roles } from '../privileges/roles';

const canOnlyReadUsers = [users.secReadV1User, users.secNotesReadUser];
const canWriteUsers = [users.secAllV1User, users.secNotesAllUser];
const canWriteOrReadUsers = [...canOnlyReadUsers, ...canWriteUsers];
const cannotAccessUsers = [users.secNoneV1User, users.secNotesNoneUser];
const cannotWriteUsers = [...canOnlyReadUsers, ...cannotAccessUsers];

export default function ({ getService }: FtrProviderContextWithSpaces) {
  const utils = getService('securitySolutionUtils');

  describe('Notes privileges', () => {
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

    describe('read notes', () => {
      let getNoteId = () => '';
      before(async () => {
        const superTest = await utils.createSuperTest(
          users.secNotesAllUser.username,
          users.secNotesAllUser.password
        );
        const {
          body: { noteId },
        } = await createNote(superTest, { text: 'test', documentId: '123' });
        getNoteId = () => noteId;
      });

      canWriteOrReadUsers.forEach((user) => {
        it(`user "${user.username}" can read notes`, async () => {
          const superTest = await utils.createSuperTest(user.username, user.password);
          await getNote(superTest, getNoteId()).expect(200);
        });
      });

      cannotAccessUsers.forEach((user) => {
        it(`user "${user.username}" cannot read notes`, async () => {
          const superTest = await utils.createSuperTest(user.username, user.password);
          await getNote(superTest, getNoteId()).expect(403);
        });
      });
    });

    describe('create notes', () => {
      canWriteUsers.forEach((user) => {
        it(`user "${user.username}" can create notes`, async () => {
          const superTest = await utils.createSuperTest(user.username, user.password);
          const { status } = await createNote(superTest, { text: 'test', documentId: '123' });
          expect(status).to.be(200);
        });
      });

      cannotWriteUsers.forEach((user) => {
        it(`user "${user.username}" cannot create notes`, async () => {
          const superTest = await utils.createSuperTest(user.username, user.password);
          const { status } = await createNote(superTest, { text: 'test', documentId: '123' });
          expect(status).to.be(403);
        });
      });
    });

    describe('delete notes', () => {
      let getNoteId = () => '';
      before(async () => {
        const superTest = await utils.createSuperTest(
          users.secNotesAllUser.username,
          users.secNotesAllUser.password
        );
        const {
          body: { noteId },
        } = await createNote(superTest, { text: 'test', documentId: '123' });
        getNoteId = () => noteId;
      });

      canWriteUsers.forEach((user) => {
        it(`user "${user.username}" can delete notes`, async () => {
          const superTest = await utils.createSuperTest(user.username, user.password);
          await deleteNote(superTest, getNoteId()).expect(200);
        });
      });

      cannotWriteUsers.forEach((user) => {
        it(`user "${user.username}" cannot delete notes`, async () => {
          const superTest = await utils.createSuperTest(user.username, user.password);
          await deleteNote(superTest, getNoteId()).expect(403);
        });
      });
    });
  });
}
