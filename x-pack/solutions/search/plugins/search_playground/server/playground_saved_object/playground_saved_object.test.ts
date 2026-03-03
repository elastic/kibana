/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  createModelVersionTestMigrator,
  type ModelVersionTestMigrator,
} from '@kbn/core-test-helpers-model-versions';

import type { SavedPlaygroundV1 } from './schema/v1/v1';
import type { SavedPlaygroundV2 } from './schema/v2/v2';
import { createPlaygroundSavedObjectType } from './playground_saved_object';

const makeStrings = (count: number, prefix = 'field') =>
  Array.from({ length: count }, (_, i) => `${prefix}_${i}`);

const baseV1Doc = {
  id: 'test-id',
  type: 'search_playground',
  references: [],
  attributes: {
    name: 'My Playground',
    indices: ['index-1'],
    queryFields: { 'index-1': ['field_a', 'field_b'] },
    elasticsearchQueryJSON: '{"query":{"match_all":{}}}',
  },
};

describe('playgroundSavedObjectType model version transformation', () => {
  let migrator: ModelVersionTestMigrator;
  beforeEach(() => {
    migrator = createModelVersionTestMigrator({ type: createPlaygroundSavedObjectType() });
  });

  describe('v1 to v2', () => {
    describe('indices truncation', () => {
      it('passes indices through unchanged when at the limit', () => {
        const indices = makeStrings(100, 'index');
        const migrated = migrator.migrate<SavedPlaygroundV1, SavedPlaygroundV2>({
          document: { ...baseV1Doc, attributes: { ...baseV1Doc.attributes, indices } },
          fromVersion: 1,
          toVersion: 2,
        });
        expect(migrated.attributes.indices).toEqual(indices);
        expect(migrated.attributes.indices).toHaveLength(100);
      });

      it('passes indices through unchanged when below the limit', () => {
        const migrated = migrator.migrate<SavedPlaygroundV1, SavedPlaygroundV2>({
          document: { ...baseV1Doc },
          fromVersion: 1,
          toVersion: 2,
        });
        expect(migrated.attributes.indices).toEqual(['index-1']);
      });

      it('truncates indices to 100 when over the limit', () => {
        const indices = makeStrings(150, 'index');
        const migrated = migrator.migrate<SavedPlaygroundV1, SavedPlaygroundV2>({
          document: { ...baseV1Doc, attributes: { ...baseV1Doc.attributes, indices } },
          fromVersion: 1,
          toVersion: 2,
        });
        expect(migrated.attributes.indices).toHaveLength(100);
        expect(migrated.attributes.indices).toEqual(indices.slice(0, 100));
      });
    });

    describe('queryFields truncation', () => {
      it('passes queryFields through unchanged when values are at the limit', () => {
        const fields = makeStrings(100);
        const queryFields = { 'index-1': fields };
        const migrated = migrator.migrate<SavedPlaygroundV1, SavedPlaygroundV2>({
          document: { ...baseV1Doc, attributes: { ...baseV1Doc.attributes, queryFields } },
          fromVersion: 1,
          toVersion: 2,
        });
        expect(migrated.attributes.queryFields['index-1']).toHaveLength(100);
        expect(migrated.attributes.queryFields['index-1']).toEqual(fields);
      });

      it('passes queryFields through unchanged when values are below the limit', () => {
        const migrated = migrator.migrate<SavedPlaygroundV1, SavedPlaygroundV2>({
          document: { ...baseV1Doc },
          fromVersion: 1,
          toVersion: 2,
        });
        expect(migrated.attributes.queryFields).toEqual({ 'index-1': ['field_a', 'field_b'] });
      });

      it('truncates queryFields values to 100 when over the limit', () => {
        const fields = makeStrings(150);
        const queryFields = { 'index-1': fields, 'index-2': makeStrings(50) };
        const migrated = migrator.migrate<SavedPlaygroundV1, SavedPlaygroundV2>({
          document: { ...baseV1Doc, attributes: { ...baseV1Doc.attributes, queryFields } },
          fromVersion: 1,
          toVersion: 2,
        });
        expect(migrated.attributes.queryFields['index-1']).toHaveLength(100);
        expect(migrated.attributes.queryFields['index-1']).toEqual(fields.slice(0, 100));
        expect(migrated.attributes.queryFields['index-2']).toHaveLength(50);
      });

      it('truncates multiple queryFields keys independently', () => {
        const queryFields = {
          'index-a': makeStrings(120, 'fa'),
          'index-b': makeStrings(200, 'fb'),
          'index-c': makeStrings(30, 'fc'),
        };
        const migrated = migrator.migrate<SavedPlaygroundV1, SavedPlaygroundV2>({
          document: { ...baseV1Doc, attributes: { ...baseV1Doc.attributes, queryFields } },
          fromVersion: 1,
          toVersion: 2,
        });
        expect(migrated.attributes.queryFields['index-a']).toHaveLength(100);
        expect(migrated.attributes.queryFields['index-b']).toHaveLength(100);
        expect(migrated.attributes.queryFields['index-c']).toHaveLength(30);
      });
    });

    describe('context.sourceFields truncation', () => {
      it('leaves context undefined when not present in v1 doc', () => {
        const migrated = migrator.migrate<SavedPlaygroundV1, SavedPlaygroundV2>({
          document: { ...baseV1Doc },
          fromVersion: 1,
          toVersion: 2,
        });
        expect(migrated.attributes.context).toBeUndefined();
      });

      it('passes context.sourceFields through unchanged when values are below the limit', () => {
        const context = {
          docSize: 3,
          sourceFields: { 'index-1': ['title', 'body'] },
        };
        const migrated = migrator.migrate<SavedPlaygroundV1, SavedPlaygroundV2>({
          document: { ...baseV1Doc, attributes: { ...baseV1Doc.attributes, context } },
          fromVersion: 1,
          toVersion: 2,
        });
        expect(migrated.attributes.context?.sourceFields).toEqual(context.sourceFields);
        expect(migrated.attributes.context?.docSize).toEqual(3);
      });

      it('truncates context.sourceFields values to 100 when over the limit', () => {
        const sourceFields = makeStrings(150, 'src');
        const context = {
          docSize: 5,
          sourceFields: { 'index-1': sourceFields },
        };
        const migrated = migrator.migrate<SavedPlaygroundV1, SavedPlaygroundV2>({
          document: { ...baseV1Doc, attributes: { ...baseV1Doc.attributes, context } },
          fromVersion: 1,
          toVersion: 2,
        });
        expect(migrated.attributes.context?.sourceFields['index-1']).toHaveLength(100);
        expect(migrated.attributes.context?.sourceFields['index-1']).toEqual(
          sourceFields.slice(0, 100)
        );
        expect(migrated.attributes.context?.docSize).toEqual(5);
      });

      it('truncates multiple context.sourceFields keys independently', () => {
        const context = {
          docSize: 2,
          sourceFields: {
            'index-a': makeStrings(120, 'sa'),
            'index-b': makeStrings(80, 'sb'),
          },
        };
        const migrated = migrator.migrate<SavedPlaygroundV1, SavedPlaygroundV2>({
          document: { ...baseV1Doc, attributes: { ...baseV1Doc.attributes, context } },
          fromVersion: 1,
          toVersion: 2,
        });
        expect(migrated.attributes.context?.sourceFields['index-a']).toHaveLength(100);
        expect(migrated.attributes.context?.sourceFields['index-b']).toHaveLength(80);
      });
    });

    describe('non-array fields are preserved', () => {
      it('preserves all optional scalar fields', () => {
        const attributes = {
          ...baseV1Doc.attributes,
          prompt: 'You are a helpful assistant.',
          citations: true,
          userElasticsearchQueryJSON: '{"query":{"term":{"status":"active"}}}',
          summarizationModel: { connectorId: 'connector-1', modelId: 'gpt-4' },
        };
        const migrated = migrator.migrate<SavedPlaygroundV1, SavedPlaygroundV2>({
          document: { ...baseV1Doc, attributes },
          fromVersion: 1,
          toVersion: 2,
        });
        expect(migrated.attributes.prompt).toBe('You are a helpful assistant.');
        expect(migrated.attributes.citations).toBe(true);
        expect(migrated.attributes.userElasticsearchQueryJSON).toBe(
          '{"query":{"term":{"status":"active"}}}'
        );
        expect(migrated.attributes.summarizationModel).toEqual({
          connectorId: 'connector-1',
          modelId: 'gpt-4',
        });
        expect(migrated.attributes.name).toBe('My Playground');
        expect(migrated.attributes.elasticsearchQueryJSON).toBe('{"query":{"match_all":{}}}');
      });
    });

    describe('combined truncation', () => {
      it('truncates indices, queryFields, and context.sourceFields simultaneously', () => {
        const indices = makeStrings(200, 'index');
        const queryFields = {
          'index-1': makeStrings(150, 'qf'),
          'index-2': makeStrings(50, 'qf2'),
        };
        const context = {
          docSize: 4,
          sourceFields: {
            'index-1': makeStrings(130, 'sf'),
          },
        };
        const migrated = migrator.migrate<SavedPlaygroundV1, SavedPlaygroundV2>({
          document: {
            ...baseV1Doc,
            attributes: { ...baseV1Doc.attributes, indices, queryFields, context },
          },
          fromVersion: 1,
          toVersion: 2,
        });
        expect(migrated.attributes.indices).toHaveLength(100);
        expect(migrated.attributes.queryFields['index-1']).toHaveLength(100);
        expect(migrated.attributes.queryFields['index-2']).toHaveLength(50);
        expect(migrated.attributes.context?.sourceFields['index-1']).toHaveLength(100);
      });
    });
  });
});
