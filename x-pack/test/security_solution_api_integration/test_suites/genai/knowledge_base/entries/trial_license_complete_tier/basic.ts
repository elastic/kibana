/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import {
  DocumentEntryCreateFields,
  DocumentEntryType,
  IndexEntryCreateFields,
  IndexEntryType,
} from '@kbn/elastic-assistant-common';
import { FtrProviderContext } from '../../../../../ftr_provider_context';
import { createEntry } from '../utils/create_entry';
import { deleteTinyElser, installTinyElser, setupKnowledgeBase } from '../utils/helpers';
import { removeServerGeneratedProperties } from '../utils/remove_server_generated_properties';
import { MachineLearningProvider } from '../../../../../../functional/services/ml';

const documentEntry: DocumentEntryCreateFields = {
  name: 'Sample Document Entry',
  type: DocumentEntryType.value,
  required: false,
  source: 'api',
  kbResource: 'user',
  namespace: 'default',
  text: 'This is a sample document entry',
  users: [],
};

const indexEntry: IndexEntryCreateFields = {
  name: 'Sample Index Entry',
  type: IndexEntryType.value,
  namespace: 'default',
  index: 'sample-index',
  field: 'sample-field',
  description: 'This is a sample index entry',
  users: [],
  queryDescription: 'Use sample-field to search in sample-index',
};

export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const log = getService('log');
  const ml = getService('ml') as ReturnType<typeof MachineLearningProvider>;

  describe('@ess @serverless Basic Security AI Assistant Knowledge Base Entries', () => {
    before(async () => {
      await installTinyElser(ml);
      await setupKnowledgeBase(supertest, log);
    });

    after(async () => {
      await deleteTinyElser(ml);
    });

    describe('Create Entries', () => {
      it('should create a new document entry', async () => {
        const entry = await createEntry(supertest, log, documentEntry);

        expect(removeServerGeneratedProperties(entry)).toEqual(documentEntry);
      });

      it('should create a new index entry', async () => {
        const entry = await createEntry(supertest, log, indexEntry);

        const expectedIndexEntry = {
          ...indexEntry,
          inputSchema: [],
          outputFields: [],
        };

        expect(removeServerGeneratedProperties(entry)).toEqual(expectedIndexEntry);
      });
    });
  });
};
