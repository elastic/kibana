/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import { FtrProviderContext } from '../../../../../ftr_provider_context';
import { createEntry, createEntryForUser } from '../utils/create_entry';
import { findEntries } from '../utils/find_entry';
import {
  clearKnowledgeBase,
  deleteTinyElser,
  installTinyElser,
  setupKnowledgeBase,
} from '../utils/helpers';
import { removeServerGeneratedProperties } from '../utils/remove_server_generated_properties';
import { MachineLearningProvider } from '../../../../../../functional/services/ml';
import { documentEntry, indexEntry, globalDocumentEntry } from './mocks/entries';
import { secOnlySpacesAll } from '../utils/auth/users';

export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const log = getService('log');
  const es = getService('es');
  const ml = getService('ml') as ReturnType<typeof MachineLearningProvider>;

  describe('@ess Basic Security AI Assistant Knowledge Base Entries', () => {
    before(async () => {
      await installTinyElser(ml);
      await setupKnowledgeBase(supertest, log);
    });

    after(async () => {
      await deleteTinyElser(ml);
    });

    afterEach(async () => {
      await clearKnowledgeBase(es);
    });

    describe('Create Entries', () => {
      // TODO: KB-RBAC: Added stubbed admin tests for when RBAC is enabled. Hopefully this helps :]
      // NOTE: Will need to update each section with the expected user, can use `createEntryForUser()` helper
      describe('Admin User', () => {
        it('should create a new document entry for the current user', async () => {
          const entry = await createEntry({ supertest, log, entry: documentEntry });

          const expectedDocumentEntry = {
            ...documentEntry,
            users: [{ name: 'elastic' }],
          };

          expect(removeServerGeneratedProperties(entry)).toEqual(expectedDocumentEntry);
        });

        it('should create a new index entry for the current user', async () => {
          const entry = await createEntry({ supertest, log, entry: indexEntry });

          const expectedIndexEntry = {
            ...indexEntry,
            inputSchema: [],
            outputFields: [],
            users: [{ name: 'elastic' }],
          };

          expect(removeServerGeneratedProperties(entry)).toEqual(expectedIndexEntry);
        });

        it('should create a new global entry for all users', async () => {
          const entry = await createEntry({ supertest, log, entry: globalDocumentEntry });

          expect(removeServerGeneratedProperties(entry)).toEqual(globalDocumentEntry);
        });

        it('should create a new global entry for all users in another space', async () => {
          const entry = await createEntry({
            supertest,
            log,
            entry: globalDocumentEntry,
            space: 'space-x',
          });

          const expectedDocumentEntry = {
            ...globalDocumentEntry,
            namespace: 'space-x',
          };

          expect(removeServerGeneratedProperties(entry)).toEqual(expectedDocumentEntry);
        });
      });

      describe('Non-Admin User', () => {
        it('should create a new document entry', async () => {
          const entry = await createEntry({ supertest, log, entry: documentEntry });

          const expectedDocumentEntry = {
            ...documentEntry,
            users: [{ name: 'elastic' }],
          };

          expect(removeServerGeneratedProperties(entry)).toEqual(expectedDocumentEntry);
        });

        it('should create a new index entry', async () => {
          const entry = await createEntry({ supertest, log, entry: indexEntry });

          const expectedIndexEntry = {
            ...indexEntry,
            inputSchema: [],
            outputFields: [],
            users: [{ name: 'elastic' }],
          };

          expect(removeServerGeneratedProperties(entry)).toEqual(expectedIndexEntry);
        });

        it('should not be able to create an entry for another user', async () => {
          const entry = await createEntry({
            supertest,
            log,
            entry: {
              ...documentEntry,
              users: [{ name: 'george' }],
            },
          });

          const expectedDocumentEntry = {
            ...documentEntry,
            users: [{ name: 'elastic' }],
          };

          expect(removeServerGeneratedProperties(entry)).toEqual(expectedDocumentEntry);
        });

        // TODO: KB-RBAC: Action not currently limited without RBAC
        it.skip('should not be able to create a global entry', async () => {
          const entry = await createEntry({ supertest, log, entry: globalDocumentEntry });

          const expectedDocumentEntry = {
            ...globalDocumentEntry,
            users: [{ name: 'elastic' }],
          };

          expect(removeServerGeneratedProperties(entry)).toEqual(expectedDocumentEntry);
        });
      });
    });

    describe('Find Entries', () => {
      it('should see other users global entries', async () => {
        const users = [secOnlySpacesAll];

        await Promise.all(
          users.map((user) =>
            createEntryForUser({
              supertestWithoutAuth,
              log,
              entry: globalDocumentEntry,
              user,
            })
          )
        );

        const entries = await findEntries({ supertest, log });

        expect(entries.total).toEqual(1);
      });

      it('should not see other users private entries', async () => {
        const users = [secOnlySpacesAll];

        await Promise.all(
          users.map((user) =>
            createEntryForUser({
              supertestWithoutAuth,
              log,
              entry: documentEntry,
              user,
            })
          )
        );

        const entries = await findEntries({ supertest, log });

        expect(entries.total).toEqual(0);
      });
    });
  });
};
