/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import { KNOWLEDGE_BASE_ENTRIES_TABLE_MAX_PAGE_SIZE } from '@kbn/elastic-assistant-plugin/common/constants';
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
import { secOnlySpacesAll, secOnlySpacesAllAssistantMinimalAll } from '../utils/auth/users';
import {
  bulkActionKnowledgeBaseEntries,
  bulkActionKnowledgeBaseEntriesForUser,
} from '../utils/bulk_actions_entry';

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

        it('should not be able to create a global entry', async () => {
          const response = await createEntryForUser({
            supertestWithoutAuth,
            log,
            entry: globalDocumentEntry,
            user: secOnlySpacesAllAssistantMinimalAll,
            expectedHttpCode: 500,
          });
          expect(response).toEqual({
            status_code: 500,
            message: 'User lacks privileges to create global knowledge base entries',
          });
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

    describe('Bulk Actions', () => {
      describe('General', () => {
        it(`should throw an error for more than ${KNOWLEDGE_BASE_ENTRIES_TABLE_MAX_PAGE_SIZE} actions`, async () => {
          const entry = await createEntry({ supertest, log, entry: documentEntry });
          const updatedDocumentEntry = {
            id: entry.id,
            ...documentEntry,
            text: 'This is a sample of updated document entry',
          };
          const response = await bulkActionKnowledgeBaseEntries({
            supertest,
            log,
            payload: {
              create: [documentEntry],
              update: [updatedDocumentEntry],
              delete: {
                ids: Array(KNOWLEDGE_BASE_ENTRIES_TABLE_MAX_PAGE_SIZE).fill('fake-document-id'),
              },
            },
            expectedHttpCode: 400,
          });
          expect(response).toEqual({
            status_code: 400,
            message: `More than ${KNOWLEDGE_BASE_ENTRIES_TABLE_MAX_PAGE_SIZE} ids sent for bulk edit action.`,
          });
        });

        it('should perform create, update and delete actions for the current user', async () => {
          const entry1 = await createEntry({ supertest, log, entry: documentEntry });
          const entry2 = await createEntry({ supertest, log, entry: globalDocumentEntry });

          const updatedDocumentEntry = {
            id: entry2.id,
            ...globalDocumentEntry,
            text: 'This is a sample of updated document entry',
          };
          const expectedUpdatedDocumentEntry = {
            ...globalDocumentEntry,
            text: 'This is a sample of updated document entry',
          };

          const response = await bulkActionKnowledgeBaseEntries({
            supertest,
            log,
            payload: {
              create: [indexEntry],
              update: [updatedDocumentEntry],
              delete: { ids: [entry1.id] },
            },
          });

          const expectedCreatedIndexEntry = {
            ...indexEntry,
            users: [{ name: 'elastic' }],
          };

          expect(response.attributes.summary.succeeded).toEqual(3);
          expect(response.attributes.summary.total).toEqual(3);
          expect(response.attributes.results.created).toEqual(
            expect.arrayContaining([expect.objectContaining(expectedCreatedIndexEntry)])
          );
          expect(response.attributes.results.updated).toEqual(
            expect.arrayContaining([expect.objectContaining(expectedUpdatedDocumentEntry)])
          );
          expect(response.attributes.results.deleted).toEqual(expect.arrayContaining([entry1.id]));
        });
      });

      describe('Create Entries', () => {
        it('should create a new document entry for the current user', async () => {
          const response = await bulkActionKnowledgeBaseEntries({
            supertest,
            log,
            payload: { create: [documentEntry] },
          });

          const expectedDocumentEntry = {
            ...documentEntry,
            users: [{ name: 'elastic' }],
          };

          expect(response.attributes.summary.succeeded).toEqual(1);
          expect(response.attributes.summary.total).toEqual(1);
          expect(response.attributes.results.created).toEqual(
            expect.arrayContaining([expect.objectContaining(expectedDocumentEntry)])
          );
        });

        it('should create a new index entry for the current user', async () => {
          const response = await bulkActionKnowledgeBaseEntries({
            supertest,
            log,
            payload: { create: [indexEntry] },
          });

          const expectedIndexEntry = {
            ...indexEntry,
            inputSchema: [],
            outputFields: [],
            users: [{ name: 'elastic' }],
          };

          expect(response.attributes.summary.succeeded).toEqual(1);
          expect(response.attributes.summary.total).toEqual(1);
          expect(response.attributes.results.created).toEqual(
            expect.arrayContaining([expect.objectContaining(expectedIndexEntry)])
          );
        });

        it('should create a new global entry for all users', async () => {
          const response = await bulkActionKnowledgeBaseEntries({
            supertest,
            log,
            payload: { create: [globalDocumentEntry] },
          });

          expect(response.attributes.summary.succeeded).toEqual(1);
          expect(response.attributes.summary.total).toEqual(1);
          expect(response.attributes.results.created).toEqual(
            expect.arrayContaining([expect.objectContaining(globalDocumentEntry)])
          );
        });

        it('should create a new global entry for all users in another space', async () => {
          const response = await bulkActionKnowledgeBaseEntries({
            supertest,
            log,
            payload: { create: [globalDocumentEntry] },
            space: 'space-x',
          });

          const expectedDocumentEntry = {
            ...globalDocumentEntry,
            namespace: 'space-x',
          };

          expect(response.attributes.summary.succeeded).toEqual(1);
          expect(response.attributes.summary.total).toEqual(1);
          expect(response.attributes.results.created).toEqual(
            expect.arrayContaining([expect.objectContaining(expectedDocumentEntry)])
          );
        });

        it('should create own private document even if user does not have `manage_global_knowledge_base` privileges', async () => {
          const response = await bulkActionKnowledgeBaseEntriesForUser({
            supertestWithoutAuth,
            log,
            payload: { create: [documentEntry] },
            user: secOnlySpacesAllAssistantMinimalAll,
          });

          const expectedDocumentEntry = {
            ...documentEntry,
            users: [{ name: secOnlySpacesAllAssistantMinimalAll.username }],
          };

          expect(response.attributes.summary.succeeded).toEqual(1);
          expect(response.attributes.summary.total).toEqual(1);
          expect(response.attributes.results.created).toEqual(
            expect.arrayContaining([expect.objectContaining(expectedDocumentEntry)])
          );
        });

        it('should not create global document if user does not have `manage_global_knowledge_base` privileges', async () => {
          const response = await bulkActionKnowledgeBaseEntriesForUser({
            supertestWithoutAuth,
            log,
            payload: { create: [globalDocumentEntry] },
            user: secOnlySpacesAllAssistantMinimalAll,
            expectedHttpCode: 500,
          });
          expect(response).toEqual({
            status_code: 500,
            message: 'User lacks privileges to create global knowledge base entries',
          });
        });
      });

      describe('Update Entries', () => {
        it('should update own document entry', async () => {
          const entry = await createEntry({ supertest, log, entry: documentEntry });
          const updatedDocumentEntry = {
            id: entry.id,
            ...documentEntry,
            text: 'This is a sample of updated document entry',
          };
          const response = await bulkActionKnowledgeBaseEntries({
            supertest,
            log,
            payload: { update: [updatedDocumentEntry] },
          });

          const expectedDocumentEntry = {
            ...documentEntry,
            users: [{ name: 'elastic' }],
            text: 'This is a sample of updated document entry',
          };

          expect(response.attributes.summary.succeeded).toEqual(1);
          expect(response.attributes.summary.total).toEqual(1);
          expect(response.attributes.results.updated).toEqual(
            expect.arrayContaining([expect.objectContaining(expectedDocumentEntry)])
          );
        });

        it('should not update private document entry created by another user', async () => {
          const entry = await createEntryForUser({
            supertestWithoutAuth,
            log,
            entry: documentEntry,
            user: secOnlySpacesAll,
          });

          const updatedDocumentEntry = {
            id: entry.id,
            ...documentEntry,
            text: 'This is a sample of updated document entry',
          };
          const response = await bulkActionKnowledgeBaseEntries({
            supertest,
            log,
            payload: { update: [updatedDocumentEntry] },
            expectedHttpCode: 500,
          });
          expect(response).toEqual({
            status_code: 500,
            message: `Could not find documents to update: ${entry.id}.`,
          });
        });

        it('should update own global document entry', async () => {
          const entry = await createEntry({ supertest, log, entry: globalDocumentEntry });
          const updatedDocumentEntry = {
            id: entry.id,
            ...globalDocumentEntry,
            text: 'This is a sample of updated global document entry',
          };
          const response = await bulkActionKnowledgeBaseEntries({
            supertest,
            log,
            payload: { update: [updatedDocumentEntry] },
          });

          const expectedDocumentEntry = {
            ...globalDocumentEntry,
            text: 'This is a sample of updated global document entry',
          };

          expect(response.attributes.summary.succeeded).toEqual(1);
          expect(response.attributes.summary.total).toEqual(1);
          expect(response.attributes.results.updated).toEqual(
            expect.arrayContaining([expect.objectContaining(expectedDocumentEntry)])
          );
        });

        it('should update global document entry created by another user', async () => {
          const entry = await createEntryForUser({
            supertestWithoutAuth,
            log,
            entry: globalDocumentEntry,
            user: secOnlySpacesAll,
          });
          const updatedDocumentEntry = {
            id: entry.id,
            ...globalDocumentEntry,
            text: 'This is a sample of updated global document entry',
          };
          const response = await bulkActionKnowledgeBaseEntries({
            supertest,
            log,
            payload: { update: [updatedDocumentEntry] },
          });

          const expectedDocumentEntry = {
            ...globalDocumentEntry,
            text: 'This is a sample of updated global document entry',
          };

          expect(response.attributes.summary.succeeded).toEqual(1);
          expect(response.attributes.summary.total).toEqual(1);
          expect(response.attributes.results.updated).toEqual(
            expect.arrayContaining([expect.objectContaining(expectedDocumentEntry)])
          );
        });

        it('should update own private document even if user does not have `manage_global_knowledge_base` privileges', async () => {
          const entry = await createEntryForUser({
            supertestWithoutAuth,
            log,
            entry: documentEntry,
            user: secOnlySpacesAllAssistantMinimalAll,
          });

          const updatedDocumentEntry = {
            id: entry.id,
            ...documentEntry,
            text: 'This is a sample of updated document entry',
          };
          const response = await bulkActionKnowledgeBaseEntriesForUser({
            supertestWithoutAuth,
            log,
            payload: { update: [updatedDocumentEntry] },
            user: secOnlySpacesAllAssistantMinimalAll,
          });

          const expectedDocumentEntry = {
            ...documentEntry,
            users: [{ name: secOnlySpacesAllAssistantMinimalAll.username }],
            text: 'This is a sample of updated document entry',
          };

          expect(response.attributes.summary.succeeded).toEqual(1);
          expect(response.attributes.summary.total).toEqual(1);
          expect(response.attributes.results.updated).toEqual(
            expect.arrayContaining([expect.objectContaining(expectedDocumentEntry)])
          );
        });

        it('should not update global document if user does not have `manage_global_knowledge_base` privileges', async () => {
          const entry = await createEntry({ supertest, log, entry: globalDocumentEntry });
          const updatedDocumentEntry = {
            id: entry.id,
            ...globalDocumentEntry,
            text: 'This is a sample of updated global document entry',
          };
          const response = await bulkActionKnowledgeBaseEntriesForUser({
            supertestWithoutAuth,
            log,
            payload: { update: [updatedDocumentEntry] },
            user: secOnlySpacesAllAssistantMinimalAll,
            expectedHttpCode: 500,
          });
          expect(response).toEqual({
            status_code: 500,
            message: 'User lacks privileges to update global knowledge base entries',
          });
        });
      });

      describe('Delete Entries', () => {
        it('should delete own document entry', async () => {
          const entry = await createEntry({ supertest, log, entry: documentEntry });
          const response = await bulkActionKnowledgeBaseEntries({
            supertest,
            log,
            payload: { delete: { ids: [entry.id] } },
          });

          expect(response.attributes.summary.succeeded).toEqual(1);
          expect(response.attributes.summary.total).toEqual(1);
          expect(response.attributes.results.deleted).toEqual(expect.arrayContaining([entry.id]));
        });

        it('should not delete private document entry created by another user', async () => {
          const entry = await createEntryForUser({
            supertestWithoutAuth,
            log,
            entry: documentEntry,
            user: secOnlySpacesAll,
          });
          const response = await bulkActionKnowledgeBaseEntries({
            supertest,
            log,
            payload: { delete: { ids: [entry.id] } },
            expectedHttpCode: 500,
          });
          expect(response).toEqual({
            status_code: 500,
            message: `Could not find documents to delete: ${entry.id}.`,
          });
        });

        it('should delete own global document entry', async () => {
          const entry = await createEntry({ supertest, log, entry: globalDocumentEntry });
          const response = await bulkActionKnowledgeBaseEntries({
            supertest,
            log,
            payload: { delete: { ids: [entry.id] } },
          });

          expect(response.attributes.summary.succeeded).toEqual(1);
          expect(response.attributes.summary.total).toEqual(1);
          expect(response.attributes.results.deleted).toEqual(expect.arrayContaining([entry.id]));
        });

        it('should delete global document entry created by another user', async () => {
          const entry = await createEntryForUser({
            supertestWithoutAuth,
            log,
            entry: globalDocumentEntry,
            user: secOnlySpacesAll,
          });
          const response = await bulkActionKnowledgeBaseEntries({
            supertest,
            log,
            payload: { delete: { ids: [entry.id] } },
          });

          expect(response.attributes.summary.succeeded).toEqual(1);
          expect(response.attributes.summary.total).toEqual(1);
          expect(response.attributes.results.deleted).toEqual(expect.arrayContaining([entry.id]));
        });

        it('should delete own private document even if user does not have `manage_global_knowledge_base` privileges', async () => {
          const entry = await createEntryForUser({
            supertestWithoutAuth,
            log,
            entry: documentEntry,
            user: secOnlySpacesAllAssistantMinimalAll,
          });
          const response = await bulkActionKnowledgeBaseEntriesForUser({
            supertestWithoutAuth,
            log,
            payload: { delete: { ids: [entry.id] } },
            user: secOnlySpacesAllAssistantMinimalAll,
          });

          expect(response.attributes.summary.succeeded).toEqual(1);
          expect(response.attributes.summary.total).toEqual(1);
          expect(response.attributes.results.deleted).toEqual(expect.arrayContaining([entry.id]));
        });

        it('should not delete global document if user does not have `manage_global_knowledge_base` privileges', async () => {
          const entry = await createEntry({ supertest, log, entry: globalDocumentEntry });
          const response = await bulkActionKnowledgeBaseEntriesForUser({
            supertestWithoutAuth,
            log,
            payload: { delete: { ids: [entry.id] } },
            user: secOnlySpacesAllAssistantMinimalAll,
            expectedHttpCode: 500,
          });
          expect(response).toEqual({
            status_code: 500,
            message: 'User lacks privileges to delete global knowledge base entries',
          });
        });
      });
    });
  });
};
