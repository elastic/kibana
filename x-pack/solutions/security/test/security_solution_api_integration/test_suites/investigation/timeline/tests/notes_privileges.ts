/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { FtrProviderContextWithSpaces } from '../../../../ftr_provider_context_with_spaces';
import { createNote, deleteNote, getNote } from '../../utils/notes';
import * as roles from '../../../../config/privileges/roles';

const canOnlyReadRoles = [roles.secReadV1, roles.secNotesReadV2];
const canWriteRoles = [roles.secAllV1, roles.secNotesAllV2];
const canWriteOrReadRoles = [...canOnlyReadRoles, ...canWriteRoles];
const cannotAccessRoles = [roles.secNoneV1, roles.secNotesNoneV2];
const cannotWriteRoles = [...canOnlyReadRoles, ...cannotAccessRoles];

export default function ({ getService }: FtrProviderContextWithSpaces) {
  const utils = getService('securitySolutionUtils');
  const config = getService('config');
  const isServerless = config.get('serverless');
  const isEss = !isServerless;

  describe('Notes privileges', () => {
    after(async () => {
      if (isEss) {
        try {
          await utils.deleteUsers(roles.roles.map(({ name }) => name));
          await utils.deleteRoles(roles.roles.map(({ name }) => name));
        } catch (err) {
          // do nothing
        }
      }
      await utils.cleanUpCustomRole();
    });

    describe('read notes', () => {
      let getNoteId = () => '';
      before(async () => {
        const superTest = await utils.createSuperTestWithCustomRole(roles.secNotesAllV2);
        const {
          body: {
            note: { noteId },
          },
        } = await createNote(superTest, { text: 'test', documentId: '123' });
        getNoteId = () => noteId;
      });

      canWriteOrReadRoles.forEach((role) => {
        it(`role "${role.name}" can read notes`, async () => {
          const superTest = await utils.createSuperTestWithCustomRole(role);
          const getNoteResponse = await getNote(superTest, getNoteId());
          expect(getNoteResponse.status).to.be(200);
        });
      });

      cannotAccessRoles.forEach((role) => {
        it(`role "${role.name}" cannot read notes`, async () => {
          const superTest = await utils.createSuperTestWithCustomRole(role);
          const getNoteResponse = await getNote(superTest, getNoteId());
          expect(getNoteResponse.status).to.be(403);
        });
      });
    });

    describe('create notes', () => {
      canWriteRoles.forEach((role) => {
        it(`role "${role.name}" can create notes`, async () => {
          const superTest = await utils.createSuperTestWithCustomRole(role);
          const { status } = await createNote(superTest, { text: 'test', documentId: '123' });
          expect(status).to.be(200);
        });
      });

      cannotWriteRoles.forEach((role) => {
        it(`role "${role.name}" cannot create notes`, async () => {
          const superTest = await utils.createSuperTestWithCustomRole(role);
          const { status } = await createNote(superTest, { text: 'test', documentId: '123' });
          expect(status).to.be(403);
        });
      });
    });

    describe('delete notes', () => {
      let getNoteId = () => '';
      before(async () => {
        const superTest = await utils.createSuperTestWithCustomRole(roles.secNotesAllV2);
        const {
          body: {
            note: { noteId },
          },
        } = await createNote(superTest, { text: 'test', documentId: '123' });
        getNoteId = () => noteId;
      });

      canWriteRoles.forEach((role) => {
        it(`role "${role.name}" can delete notes`, async () => {
          const superTest = await utils.createSuperTestWithCustomRole(role);
          const deleteNoteRequest = await deleteNote(superTest, getNoteId());
          expect(deleteNoteRequest.status).to.be(200);
        });
      });

      cannotWriteRoles.forEach((role) => {
        it(`role "${role.name}" cannot delete notes`, async () => {
          const superTest = await utils.createSuperTestWithCustomRole(role);
          const deleteNoteRequest = await deleteNote(superTest, getNoteId());
          expect(deleteNoteRequest.status).to.be(403);
        });
      });
    });
  });
}
