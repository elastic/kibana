/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObject, SavedObjectsFindResult } from '@kbn/core/server';
import { PLAYGROUND_SAVED_OBJECT_TYPE } from '../../common';
import { type PlaygroundSavedObject } from '../types';
import { validatePlayground, parsePlaygroundSO, parsePlaygroundSOList } from './playgrounds';

const defaultElasticsearchQueryJSON = `{"retriever":{"standard":{"query":{"multi_match":{"query":"{query}","fields":["field1"]}}}}}`;
const validSearchPlayground: PlaygroundSavedObject = {
  name: 'Test Playground',
  indices: ['index1'],
  queryFields: { index1: ['field1'] },
  elasticsearchQueryJSON: defaultElasticsearchQueryJSON,
};
const validChatPlayground: PlaygroundSavedObject = {
  ...validSearchPlayground,
  prompt: 'Test prompt',
  citations: true,
  context: {
    sourceFields: { index1: ['field1'] },
    docSize: 3,
  },
  summarizationModel: {
    connectorId: 'connectorId',
    modelId: 'model',
  },
};

describe('Playground utils', () => {
  describe('validatePlayground', () => {
    it('should return an empty array when search playground is valid', () => {
      const errors = validatePlayground(validSearchPlayground);
      expect(errors).toEqual([]);
    });
    it('should return an empty array when chat playground is valid', () => {
      const errors = validatePlayground(validChatPlayground);
      expect(errors).toEqual([]);
    });
    it('should return an empty array when playground user elasticsearch query is valid', () => {
      const playground: PlaygroundSavedObject = {
        ...validSearchPlayground,
        userElasticsearchQueryJSON:
          '{"query":{"multi_match":{"query":"{query}","fields":["field1"]}}}',
      };
      const errors = validatePlayground(playground);
      expect(errors).toEqual([]);
    });

    it('should return an error when playground name is empty', () => {
      const playground: PlaygroundSavedObject = {
        ...validSearchPlayground,
        name: '',
      };
      expect(validatePlayground(playground)).toContain('Playground name cannot be empty');
      playground.name = ' ';
      expect(validatePlayground(playground)).toContain('Playground name cannot be empty');
    });
    it('should return an error when elasticsearchQuery is invalid JSON', () => {
      const playground: PlaygroundSavedObject = {
        ...validSearchPlayground,
        elasticsearchQueryJSON: '{invalidJson}',
      };
      expect(validatePlayground(playground)).toContain(
        "Elasticsearch query JSON is invalid\nExpected property name or '}' in JSON at position 1 (line 1 column 2)"
      );
      playground.elasticsearchQueryJSON = 'invalidJson';
      expect(validatePlayground(playground)).toContain(
        `Elasticsearch query JSON is invalid\nUnexpected token 'i', "invalidJson" is not valid JSON`
      );
    });
    it('should validate queryFields', () => {
      const playground: PlaygroundSavedObject = {
        ...validSearchPlayground,
        queryFields: { index1: ['field1', ''] },
      };
      expect(validatePlayground(playground)).toContain(
        'Query field cannot be empty, index1 item 1 is empty'
      );
      playground.queryFields = { index1: [] };
      expect(validatePlayground(playground)).toContain('Query fields cannot be empty');
      playground.queryFields = { index2: ['field1'] };
      expect(validatePlayground(playground)).toContain(
        'Query fields index index2 does not match selected indices'
      );
      playground.queryFields = { index1: ['field1'] };
      expect(validatePlayground(playground)).toEqual([]);
      playground.queryFields = { index1: [''] };
      expect(validatePlayground(playground)).toContain(
        'Query field cannot be empty, index1 item 0 is empty'
      );
    });
    it('should validate context sourceFields', () => {
      const playground: PlaygroundSavedObject = {
        ...validChatPlayground,
        context: {
          sourceFields: { index1: ['field1', ''] },
          docSize: 3,
        },
      };
      expect(validatePlayground(playground)).toContain(
        'Source field cannot be empty, index1 item 1 is empty'
      );
      playground.context!.sourceFields = { index1: [] };
      expect(validatePlayground(playground)).toContain('Source fields cannot be empty');
      playground.context!.sourceFields = { index2: ['field1'] };
      expect(validatePlayground(playground)).toContain(
        'Source fields index index2 does not match selected indices'
      );
    });
  });
  describe('parsePlaygroundSO', () => {
    it('should parse saved object to api response', () => {
      const savedObject: SavedObject<PlaygroundSavedObject> = {
        id: 'my-fake-id',
        type: PLAYGROUND_SAVED_OBJECT_TYPE,
        created_at: '2023-10-01T00:00:00Z',
        updated_at: '2023-10-01T00:00:00Z',
        attributes: validChatPlayground,
        references: [],
        version: '1',
        namespaces: ['default'],
        migrationVersion: {},
        coreMigrationVersion: '9.0.0',
      };
      expect(parsePlaygroundSO(savedObject)).toEqual({
        _meta: {
          id: 'my-fake-id',
          createdAt: '2023-10-01T00:00:00Z',
          updatedAt: '2023-10-01T00:00:00Z',
        },
        data: {
          ...validChatPlayground,
        },
      });
    });
    it('should include all available metadata in api response', () => {
      const savedObject: SavedObject<PlaygroundSavedObject> = {
        id: 'my-fake-id',
        type: PLAYGROUND_SAVED_OBJECT_TYPE,
        created_at: '2023-10-01T00:00:00Z',
        created_by: 'user1',
        updated_at: '2023-10-02T00:00:00Z',
        updated_by: 'user2',
        attributes: validChatPlayground,
        references: [],
        version: '1',
        namespaces: ['default'],
        migrationVersion: {},
        coreMigrationVersion: '9.0.0',
      };
      expect(parsePlaygroundSO(savedObject)).toEqual({
        _meta: {
          id: 'my-fake-id',
          createdAt: '2023-10-01T00:00:00Z',
          createdBy: 'user1',
          updatedAt: '2023-10-02T00:00:00Z',
          updatedBy: 'user2',
        },
        data: {
          ...validChatPlayground,
        },
      });
    });
  });
  describe('parsePlaygroundSOList', () => {
    it('should parse saved object list to api response', () => {
      const savedObjects: Array<SavedObjectsFindResult<PlaygroundSavedObject>> = [
        {
          id: 'my-fake-id',
          type: PLAYGROUND_SAVED_OBJECT_TYPE,
          created_at: '2023-10-01T00:00:00Z',
          updated_at: '2023-10-01T00:00:00Z',
          attributes: validChatPlayground,
          references: [],
          version: '1',
          namespaces: ['default'],
          migrationVersion: {},
          coreMigrationVersion: '9.0.0',
          score: 1,
          sort: [0],
        },
      ];
      const response = parsePlaygroundSOList({
        total: 1,
        // @ts-ignore-next-line
        saved_objects: savedObjects,
        page: 1,
        per_page: 1,
      });
      expect(response).toEqual({
        _meta: {
          total: 1,
          page: 1,
          size: 1,
        },
        items: [
          {
            id: 'my-fake-id',
            name: validChatPlayground.name,
            createdAt: '2023-10-01T00:00:00Z',
            updatedAt: '2023-10-01T00:00:00Z',
          },
        ],
      });
    });
  });
});
