/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import { FtrProviderContext } from '../../../../../ftr_provider_context';
import { createEntry } from '../utils/create_entry';
import {
  clearKnowledgeBase,
  deleteTinyElser,
  installTinyElser,
  setupKnowledgeBase,
} from '../utils/helpers';
import { removeServerGeneratedProperties } from '../utils/remove_server_generated_properties';
import { MachineLearningProvider } from '../../../../../../functional/services/ml';
import { documentEntry, indexEntry, globalDocumentEntry } from './mocks/entries';

export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
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
      describe('Admin', () => {
        it('should create a new document entry for the current user', async () => {
          const entry = await createEntry(supertest, log, documentEntry);

          const expectedDocumentEntry = {
            ...documentEntry,
            users: [{ name: 'elastic' }],
          };

          expect(removeServerGeneratedProperties(entry)).toEqual(expectedDocumentEntry);
        });

        it('should create a new index entry for the current user', async () => {
          const entry = await createEntry(supertest, log, indexEntry);

          const expectedIndexEntry = {
            ...indexEntry,
            inputSchema: [],
            outputFields: [],
            users: [{ name: 'elastic' }],
          };

          expect(removeServerGeneratedProperties(entry)).toEqual(expectedIndexEntry);
        });

        // TODO: KB-RBAC: Action not currently allowed without RBAC
        it.skip('should create a new entry for another user', async () => {
          const entry = await createEntry(supertest, log, {
            ...documentEntry,
            users: [{ name: 'george' }],
          });

          const expectedDocumentEntry = {
            ...documentEntry,
            users: [{ name: 'george' }],
          };

          expect(removeServerGeneratedProperties(entry)).toEqual(expectedDocumentEntry);
        });

        it('should create a new global entry for all users', async () => {
          const entry = await createEntry(supertest, log, globalDocumentEntry);

          expect(removeServerGeneratedProperties(entry)).toEqual(globalDocumentEntry);
        });

        it('should create a new global entry for all users in another space', async () => {
          const entry = await createEntry(supertest, log, globalDocumentEntry, 'space-x');

          const expectedDocumentEntry = {
            ...globalDocumentEntry,
            namespace: 'space-x',
          };

          expect(removeServerGeneratedProperties(entry)).toEqual(expectedDocumentEntry);
        });
      });

      describe('User', () => {
        it('should create a new document entry', async () => {
          const entry = await createEntry(supertest, log, documentEntry);

          const expectedDocumentEntry = {
            ...documentEntry,
            users: [{ name: 'elastic' }],
          };

          expect(removeServerGeneratedProperties(entry)).toEqual(expectedDocumentEntry);
        });

        it('should create a new index entry', async () => {
          const entry = await createEntry(supertest, log, indexEntry);

          const expectedIndexEntry = {
            ...indexEntry,
            inputSchema: [],
            outputFields: [],
            users: [{ name: 'elastic' }],
          };

          expect(removeServerGeneratedProperties(entry)).toEqual(expectedIndexEntry);
        });

        it('should not be able to create an entry for another user', async () => {
          const entry = await createEntry(supertest, log, {
            ...documentEntry,
            users: [{ name: 'george' }],
          });

          const expectedDocumentEntry = {
            ...documentEntry,
            users: [{ name: 'elastic' }],
          };

          expect(removeServerGeneratedProperties(entry)).toEqual(expectedDocumentEntry);
        });

        // TODO: KB-RBAC: Action not currently limited without RBAC
        it.skip('should not be able to create a global entry', async () => {
          const entry = await createEntry(supertest, log, globalDocumentEntry);

          const expectedDocumentEntry = {
            ...globalDocumentEntry,
            users: [{ name: 'elastic' }],
          };

          expect(removeServerGeneratedProperties(entry)).toEqual(expectedDocumentEntry);
        });
      });
    });
  });
};
