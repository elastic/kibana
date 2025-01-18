/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformESSearchToKnowledgeBaseEntry, transformESToKnowledgeBase } from './transforms';
import {
  getKnowledgeBaseEntrySearchEsMock,
  documentEntry,
} from '../../__mocks__/knowledge_base_entry_schema.mock';

describe('transforms', () => {
  describe('transformESSearchToKnowledgeBaseEntry', () => {
    it('should transform Elasticsearch search response to KnowledgeBaseEntryResponse', () => {
      const esResponse = getKnowledgeBaseEntrySearchEsMock('document');

      const result = transformESSearchToKnowledgeBaseEntry(esResponse);
      expect(result).toEqual([
        {
          id: '1',
          createdAt: documentEntry.created_at,
          createdBy: documentEntry.created_by,
          updatedAt: documentEntry.updated_at,
          updatedBy: documentEntry.updated_by,
          type: documentEntry.type,
          name: documentEntry.name,
          namespace: documentEntry.namespace,
          kbResource: documentEntry.kb_resource,
          source: documentEntry.source,
          required: documentEntry.required,
          text: documentEntry.text,
          users: documentEntry.users,
        },
      ]);
    });
  });

  describe('transformESToKnowledgeBase', () => {
    it('should transform Elasticsearch response array to KnowledgeBaseEntryResponse array', () => {
      const esResponse = [documentEntry];

      const result = transformESToKnowledgeBase(esResponse);
      expect(result).toEqual([
        {
          id: documentEntry.id,
          createdAt: documentEntry.created_at,
          createdBy: documentEntry.created_by,
          updatedAt: documentEntry.updated_at,
          updatedBy: documentEntry.updated_by,
          type: documentEntry.type,
          name: documentEntry.name,
          namespace: documentEntry.namespace,
          kbResource: documentEntry.kb_resource,
          source: documentEntry.source,
          required: documentEntry.required,
          text: documentEntry.text,
          users: documentEntry.users,
        },
      ]);
    });
  });
});
