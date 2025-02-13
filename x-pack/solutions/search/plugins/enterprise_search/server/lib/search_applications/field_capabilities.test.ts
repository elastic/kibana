/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FieldCapsResponse } from '@elastic/elasticsearch/lib/api/types';
import { IScopedClusterClient } from '@kbn/core-elasticsearch-server';

import {
  EnterpriseSearchApplication,
  SchemaField,
} from '../../../common/types/search_applications';

import {
  fetchSearchApplicationFieldCapabilities,
  parseFieldsCapabilities,
} from './field_capabilities';

describe('search applications field_capabilities', () => {
  const mockClient = {
    asCurrentUser: {
      fieldCaps: jest.fn(),
      indices: { get: jest.fn(), getAlias: jest.fn() },
    },
    asInternalUser: {},
  };
  const mockSearchApplication: EnterpriseSearchApplication = {
    indices: ['index-001'],
    name: 'unit_test_search_application',
    updated_at_millis: 2202018295,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('fetchSearchApplicationFieldCapabilities', () => {
    it('gets search application alias field capabilities', async () => {
      const fieldCapsResponse: FieldCapsResponse = {
        fields: {
          body: {
            text: {
              aggregatable: false,
              metadata_field: false,
              searchable: true,
              type: 'text',
            },
          },
        },
        indices: ['index-001'],
      };

      const getAllAvailableIndexResponse = {
        'index-001': { aliases: { unit_test_search_application: {} } },
      };

      const getAliasIndicesResponse = {
        'index-001': { aliases: { unit_test_search_application: {} } },
      };

      mockClient.asCurrentUser.indices.getAlias.mockResolvedValueOnce(getAliasIndicesResponse);
      mockClient.asCurrentUser.indices.get.mockResolvedValueOnce(getAllAvailableIndexResponse);
      mockClient.asCurrentUser.fieldCaps.mockResolvedValueOnce(fieldCapsResponse);

      await expect(
        fetchSearchApplicationFieldCapabilities(
          mockClient as unknown as IScopedClusterClient,
          mockSearchApplication
        )
      ).resolves.toEqual({
        fields: [
          {
            aggregatable: false,
            indices: [
              {
                name: 'index-001',
                type: 'text',
              },
            ],
            metadata_field: false,
            name: 'body',
            searchable: true,
            type: 'text',
          },
        ],
        name: mockSearchApplication.name,
        updated_at_millis: mockSearchApplication.updated_at_millis,
      });

      expect(mockClient.asCurrentUser.fieldCaps).toHaveBeenCalledTimes(1);
      expect(mockClient.asCurrentUser.fieldCaps).toHaveBeenCalledWith({
        fields: '*',
        include_unmapped: true,
        index: ['index-001'],
        filters: '-metadata',
      });
    });
  });

  describe('parseFieldsCapabilities', () => {
    it('parse field capabilities to a list of fields', () => {
      const fieldCapabilities: FieldCapsResponse = {
        fields: {
          body: {
            text: {
              aggregatable: false,
              metadata_field: false,
              searchable: true,
              type: 'text',
            },
          },
          views: {
            number: {
              aggregatable: false,
              metadata_field: false,
              searchable: false,
              type: 'number',
            },
          },
        },
        indices: ['index-001'],
      };
      const expectedFields: SchemaField[] = [
        {
          aggregatable: false,
          indices: [
            {
              name: 'index-001',
              type: 'text',
            },
          ],
          metadata_field: false,
          name: 'body',
          searchable: true,
          type: 'text',
        },
        {
          aggregatable: false,
          indices: [
            {
              name: 'index-001',
              type: 'number',
            },
          ],
          metadata_field: false,
          name: 'views',
          searchable: false,
          type: 'number',
        },
      ];
      expect(parseFieldsCapabilities(fieldCapabilities)).toEqual(expectedFields);
    });
    it('handles multi-fields', () => {
      const fieldCapabilities: FieldCapsResponse = {
        fields: {
          body: {
            text: {
              aggregatable: false,
              metadata_field: false,
              searchable: true,
              type: 'text',
            },
          },
          'body.keyword': {
            keyword: {
              aggregatable: true,
              metadata_field: false,
              searchable: true,
              type: 'keyword',
            },
          },
        },
        indices: ['index-001'],
      };
      const expectedFields: SchemaField[] = [
        {
          aggregatable: false,
          indices: [
            {
              name: 'index-001',
              type: 'text',
            },
          ],
          metadata_field: false,
          name: 'body',
          searchable: true,
          type: 'text',
        },
        {
          aggregatable: true,
          indices: [
            {
              name: 'index-001',
              type: 'keyword',
            },
          ],
          metadata_field: false,
          name: 'body.keyword',
          searchable: true,
          type: 'keyword',
        },
      ];
      expect(parseFieldsCapabilities(fieldCapabilities)).toEqual(expectedFields);
    });
    it('handles object fields', () => {
      const fieldCapabilities: FieldCapsResponse = {
        fields: {
          name: {
            object: {
              aggregatable: false,
              metadata_field: false,
              searchable: false,
              type: 'object',
            },
          },
          'name.first': {
            text: {
              aggregatable: false,
              metadata_field: false,
              searchable: true,
              type: 'text',
            },
          },
          'name.last': {
            text: {
              aggregatable: false,
              metadata_field: false,
              searchable: true,
              type: 'text',
            },
          },
        },
        indices: ['index-001'],
      };
      const expectedFields: SchemaField[] = [
        {
          aggregatable: false,
          indices: [
            {
              name: 'index-001',
              type: 'object',
            },
          ],
          metadata_field: false,
          name: 'name',
          searchable: false,
          type: 'object',
        },
        {
          aggregatable: false,
          indices: [
            {
              name: 'index-001',
              type: 'text',
            },
          ],
          metadata_field: false,
          name: 'name.first',
          searchable: true,
          type: 'text',
        },
        {
          aggregatable: false,
          indices: [
            {
              name: 'index-001',
              type: 'text',
            },
          ],
          metadata_field: false,
          name: 'name.last',
          searchable: true,
          type: 'text',
        },
      ];
      expect(parseFieldsCapabilities(fieldCapabilities)).toEqual(expectedFields);
    });
    it('handles nested fields', () => {
      const fieldCapabilities: FieldCapsResponse = {
        fields: {
          name: {
            nested: {
              aggregatable: false,
              metadata_field: false,
              searchable: false,
              type: 'nested',
            },
          },
          'name.first': {
            text: {
              aggregatable: false,
              metadata_field: false,
              searchable: true,
              type: 'text',
            },
          },
          'name.last': {
            text: {
              aggregatable: false,
              metadata_field: false,
              searchable: true,
              type: 'text',
            },
          },
        },
        indices: ['index-001'],
      };
      const expectedFields: SchemaField[] = [
        {
          aggregatable: false,
          indices: [
            {
              name: 'index-001',
              type: 'nested',
            },
          ],
          metadata_field: false,
          name: 'name',
          searchable: false,
          type: 'nested',
        },
        {
          aggregatable: false,
          indices: [
            {
              name: 'index-001',
              type: 'text',
            },
          ],
          metadata_field: false,
          name: 'name.first',
          searchable: true,
          type: 'text',
        },
        {
          aggregatable: false,
          indices: [
            {
              name: 'index-001',
              type: 'text',
            },
          ],
          metadata_field: false,
          name: 'name.last',
          searchable: true,
          type: 'text',
        },
      ];
      expect(parseFieldsCapabilities(fieldCapabilities)).toEqual(expectedFields);
    });
    it('handles unmapped fields', () => {
      const fieldCapabilities: FieldCapsResponse = {
        fields: {
          body: {
            text: {
              aggregatable: false,
              indices: ['index-001'],
              metadata_field: false,
              searchable: true,
              type: 'text',
            },
            unmapped: {
              aggregatable: false,
              indices: ['index-002'],
              metadata_field: false,
              searchable: true,
              type: 'unmapped',
            },
          },
        },
        indices: ['index-001', 'index-002'],
      };
      const expectedFields: SchemaField[] = [
        {
          aggregatable: false,
          indices: [
            {
              name: 'index-001',
              type: 'text',
            },
            {
              name: 'index-002',
              type: 'unmapped',
            },
          ],
          metadata_field: false,
          name: 'body',
          searchable: true,
          type: 'text',
        },
      ];
      expect(parseFieldsCapabilities(fieldCapabilities)).toEqual(expectedFields);
    });
    it('handles conflicts in top-level fields', () => {
      const fieldCapabilities: FieldCapsResponse = {
        fields: {
          name: {
            object: {
              aggregatable: false,
              indices: ['index-002'],
              metadata_field: false,
              searchable: false,
              type: 'object',
            },
            text: {
              aggregatable: false,
              indices: ['index-001'],
              metadata_field: false,
              searchable: true,
              type: 'text',
            },
          },
          'name.first': {
            text: {
              aggregatable: false,
              indices: ['index-002'],
              metadata_field: false,
              searchable: true,
              type: 'text',
            },
            unmapped: {
              aggregatable: false,
              indices: ['index-001'],
              metadata_field: false,
              searchable: true,
              type: 'unmapped',
            },
          },
          'name.last': {
            text: {
              aggregatable: false,
              indices: ['index-002'],
              metadata_field: false,
              searchable: true,
              type: 'text',
            },
            unmapped: {
              aggregatable: false,
              indices: ['index-001'],
              metadata_field: false,
              searchable: true,
              type: 'unmapped',
            },
          },
        },
        indices: ['index-001', 'index-002'],
      };
      const expectedFields: SchemaField[] = [
        {
          aggregatable: false,
          indices: [
            {
              name: 'index-001',
              type: 'text',
            },
            {
              name: 'index-002',
              type: 'object',
            },
          ],
          metadata_field: false,
          name: 'name',
          searchable: true,
          type: 'conflict',
        },
        {
          aggregatable: false,
          indices: [
            {
              name: 'index-001',
              type: 'unmapped',
            },
            {
              name: 'index-002',
              type: 'text',
            },
          ],
          metadata_field: false,
          name: 'name.first',
          searchable: true,
          type: 'text',
        },
        {
          aggregatable: false,
          indices: [
            {
              name: 'index-001',
              type: 'unmapped',
            },
            {
              name: 'index-002',
              type: 'text',
            },
          ],
          metadata_field: false,
          name: 'name.last',
          searchable: true,
          type: 'text',
        },
      ];
      expect(parseFieldsCapabilities(fieldCapabilities)).toEqual(expectedFields);
    });
    it('handles conflicts of more than two indices', () => {
      const fieldCapabilities: FieldCapsResponse = {
        fields: {
          name: {
            keyword: {
              aggregatable: false,
              indices: ['index-003'],
              metadata_field: false,
              searchable: true,
              type: 'keyword',
            },
            object: {
              aggregatable: false,
              indices: ['index-002'],
              metadata_field: false,
              searchable: false,
              type: 'object',
            },
            text: {
              aggregatable: false,
              indices: ['index-001'],
              metadata_field: false,
              searchable: true,
              type: 'text',
            },
          },
          'name.first': {
            text: {
              aggregatable: false,
              indices: ['index-002', 'index-003'],
              metadata_field: false,
              searchable: true,
              type: 'text',
            },
            unmapped: {
              aggregatable: false,
              indices: ['index-001'],
              metadata_field: false,
              searchable: true,
              type: 'unmapped',
            },
          },
          'name.last': {
            text: {
              aggregatable: false,
              indices: ['index-002'],
              metadata_field: false,
              searchable: true,
              type: 'text',
            },
            unmapped: {
              aggregatable: false,
              indices: ['index-001'],
              metadata_field: false,
              searchable: true,
              type: 'unmapped',
            },
          },
        },
        indices: ['index-001', 'index-002', 'index-003'],
      };

      const expectedFields: SchemaField[] = [
        {
          aggregatable: false,
          indices: [
            {
              name: 'index-001',
              type: 'text',
            },
            {
              name: 'index-002',
              type: 'object',
            },
            {
              name: 'index-003',
              type: 'keyword',
            },
          ],
          metadata_field: false,
          name: 'name',
          searchable: true,
          type: 'conflict',
        },
        {
          aggregatable: false,
          indices: [
            {
              name: 'index-001',
              type: 'unmapped',
            },
            {
              name: 'index-002',
              type: 'text',
            },
            {
              name: 'index-003',
              type: 'text',
            },
          ],
          metadata_field: false,
          name: 'name.first',
          searchable: true,
          type: 'text',
        },
        {
          aggregatable: false,
          indices: [
            {
              name: 'index-001',
              type: 'unmapped',
            },
            {
              name: 'index-002',
              type: 'text',
            },
            {
              name: 'index-003',
              type: 'unmapped',
            },
          ],
          metadata_field: false,
          name: 'name.last',
          searchable: true,
          type: 'text',
        },
      ];
      expect(parseFieldsCapabilities(fieldCapabilities)).toEqual(expectedFields);
    });
    it('handles conflicts & unmapped fields together', () => {
      const fieldCapabilities: FieldCapsResponse = {
        fields: {
          body: {
            text: {
              aggregatable: false,
              indices: ['index-003'],
              metadata_field: false,
              searchable: true,
              type: 'text',
            },
            unmapped: {
              aggregatable: false,
              indices: ['index-001', 'index-002'],
              metadata_field: false,
              searchable: true,
              type: 'unmapped',
            },
          },
          name: {
            object: {
              aggregatable: false,
              indices: ['index-002'],
              metadata_field: false,
              searchable: false,
              type: 'object',
            },
            text: {
              aggregatable: false,
              indices: ['index-001'],
              metadata_field: false,
              searchable: true,
              type: 'text',
            },
            unmapped: {
              aggregatable: false,
              indices: ['index-003'],
              metadata_field: false,
              searchable: true,
              type: 'unmapped',
            },
          },
          'name.first': {
            text: {
              aggregatable: false,
              indices: ['index-002'],
              metadata_field: false,
              searchable: true,
              type: 'text',
            },
            unmapped: {
              aggregatable: false,
              indices: ['index-001', 'index-003'],
              metadata_field: false,
              searchable: true,
              type: 'unmapped',
            },
          },
          'name.last': {
            text: {
              aggregatable: false,
              indices: ['index-002'],
              metadata_field: false,
              searchable: true,
              type: 'text',
            },
            unmapped: {
              aggregatable: false,
              indices: ['index-001', 'index-003'],
              metadata_field: false,
              searchable: true,
              type: 'unmapped',
            },
          },
        },
        indices: ['index-001', 'index-002', 'index-003'],
      };
      const expectedFields: SchemaField[] = [
        {
          aggregatable: false,
          indices: [
            {
              name: 'index-001',
              type: 'unmapped',
            },
            {
              name: 'index-002',
              type: 'unmapped',
            },
            {
              name: 'index-003',
              type: 'text',
            },
          ],
          metadata_field: false,
          name: 'body',
          searchable: true,
          type: 'text',
        },
        {
          aggregatable: false,
          indices: [
            {
              name: 'index-001',
              type: 'text',
            },
            {
              name: 'index-002',
              type: 'object',
            },
            {
              name: 'index-003',
              type: 'unmapped',
            },
          ],
          metadata_field: false,
          name: 'name',
          searchable: true,
          type: 'conflict',
        },
        {
          aggregatable: false,
          indices: [
            {
              name: 'index-001',
              type: 'unmapped',
            },
            {
              name: 'index-002',
              type: 'text',
            },
            {
              name: 'index-003',
              type: 'unmapped',
            },
          ],
          metadata_field: false,
          name: 'name.first',
          searchable: true,
          type: 'text',
        },
        {
          aggregatable: false,
          indices: [
            {
              name: 'index-001',
              type: 'unmapped',
            },
            {
              name: 'index-002',
              type: 'text',
            },
            {
              name: 'index-003',
              type: 'unmapped',
            },
          ],
          metadata_field: false,
          name: 'name.last',
          searchable: true,
          type: 'text',
        },
      ];
      expect(parseFieldsCapabilities(fieldCapabilities)).toEqual(expectedFields);
    });
    it('handles unmapped sub-fields in object fields', () => {
      const fieldCapabilities: FieldCapsResponse = {
        fields: {
          name: {
            object: {
              aggregatable: false,
              metadata_field: false,
              searchable: false,
              type: 'object',
            },
          },
          'name.first': {
            text: {
              aggregatable: false,
              metadata_field: false,
              searchable: true,
              type: 'text',
            },
          },
          'name.last': {
            text: {
              aggregatable: false,
              indices: ['index-001'],
              metadata_field: false,
              searchable: true,
              type: 'text',
            },
            unmapped: {
              aggregatable: false,
              indices: ['index-002'],
              metadata_field: false,
              searchable: true,
              type: 'unmapped',
            },
          },
        },
        indices: ['index-001', 'index-002'],
      };
      const expectedFields: SchemaField[] = [
        {
          aggregatable: false,
          indices: [
            {
              name: 'index-001',
              type: 'object',
            },
            {
              name: 'index-002',
              type: 'object',
            },
          ],
          metadata_field: false,
          name: 'name',
          searchable: false,
          type: 'object',
        },
        {
          aggregatable: false,
          indices: [
            {
              name: 'index-001',
              type: 'text',
            },
            {
              name: 'index-002',
              type: 'text',
            },
          ],
          metadata_field: false,
          name: 'name.first',
          searchable: true,
          type: 'text',
        },
        {
          aggregatable: false,
          indices: [
            {
              name: 'index-001',
              type: 'text',
            },
            {
              name: 'index-002',
              type: 'unmapped',
            },
          ],
          metadata_field: false,
          name: 'name.last',
          searchable: true,
          type: 'text',
        },
      ];
      expect(parseFieldsCapabilities(fieldCapabilities)).toEqual(expectedFields);
    });
    it('handles unmapped sub-fields in  nested fields', () => {
      const fieldCapabilities: FieldCapsResponse = {
        fields: {
          name: {
            nested: {
              aggregatable: false,
              metadata_field: false,
              searchable: false,
              type: 'nested',
            },
          },
          'name.first': {
            text: {
              aggregatable: false,
              metadata_field: false,
              searchable: true,
              type: 'text',
            },
          },
          'name.last': {
            text: {
              aggregatable: false,
              indices: ['index-001'],
              metadata_field: false,
              searchable: true,
              type: 'text',
            },
            unmapped: {
              aggregatable: false,
              indices: ['index-002'],
              metadata_field: false,
              searchable: true,
              type: 'unmapped',
            },
          },
        },
        indices: ['index-001', 'index-002'],
      };
      const expectedFields: SchemaField[] = [
        {
          aggregatable: false,
          indices: [
            {
              name: 'index-001',
              type: 'nested',
            },
            {
              name: 'index-002',
              type: 'nested',
            },
          ],
          metadata_field: false,
          name: 'name',
          searchable: false,
          type: 'nested',
        },
        {
          aggregatable: false,
          indices: [
            {
              name: 'index-001',
              type: 'text',
            },
            {
              name: 'index-002',
              type: 'text',
            },
          ],
          metadata_field: false,
          name: 'name.first',
          searchable: true,
          type: 'text',
        },
        {
          aggregatable: false,
          indices: [
            {
              name: 'index-001',
              type: 'text',
            },
            {
              name: 'index-002',
              type: 'unmapped',
            },
          ],
          metadata_field: false,
          name: 'name.last',
          searchable: true,
          type: 'text',
        },
      ];
      expect(parseFieldsCapabilities(fieldCapabilities)).toEqual(expectedFields);
    });
    it('handles unmapped multi fields', () => {
      const fieldCapabilities: FieldCapsResponse = {
        fields: {
          body: {
            text: {
              aggregatable: false,
              metadata_field: false,
              searchable: true,
              type: 'text',
            },
          },
          'body.keyword': {
            keyword: {
              aggregatable: true,
              indices: ['index-001'],
              metadata_field: false,
              searchable: true,
              type: 'keyword',
            },
            unmapped: {
              aggregatable: false,
              indices: ['index-002'],
              metadata_field: false,
              searchable: true,
              type: 'unmapped',
            },
          },
        },
        indices: ['index-001', 'index-002'],
      };
      const expectedFields: SchemaField[] = [
        {
          aggregatable: false,
          indices: [
            {
              name: 'index-001',
              type: 'text',
            },
            {
              name: 'index-002',
              type: 'text',
            },
          ],
          metadata_field: false,
          name: 'body',
          searchable: true,
          type: 'text',
        },
        {
          aggregatable: true,
          indices: [
            {
              name: 'index-001',
              type: 'keyword',
            },
            {
              name: 'index-002',
              type: 'unmapped',
            },
          ],
          metadata_field: false,
          name: 'body.keyword',
          searchable: true,
          type: 'keyword',
        },
      ];
      expect(parseFieldsCapabilities(fieldCapabilities)).toEqual(expectedFields);
    });
    it('handles conflicts in object fields', () => {
      const fieldCapabilities: FieldCapsResponse = {
        fields: {
          order: {
            object: {
              aggregatable: false,
              metadata_field: false,
              searchable: false,
              type: 'object',
            },
          },
          'order.id': {
            number: {
              aggregatable: false,
              indices: ['index-002'],
              metadata_field: false,
              searchable: false,
              type: 'number',
            },
            text: {
              aggregatable: false,
              indices: ['index-001'],
              metadata_field: false,
              searchable: true,
              type: 'text',
            },
          },
        },
        indices: ['index-001', 'index-002'],
      };
      const expectedFields: SchemaField[] = [
        {
          aggregatable: false,
          indices: [
            {
              name: 'index-001',
              type: 'object',
            },
            {
              name: 'index-002',
              type: 'object',
            },
          ],
          metadata_field: false,
          name: 'order',
          searchable: false,
          type: 'object',
        },
        {
          aggregatable: false,
          indices: [
            {
              name: 'index-001',
              type: 'text',
            },
            {
              name: 'index-002',
              type: 'number',
            },
          ],
          metadata_field: false,
          name: 'order.id',
          searchable: true,
          type: 'conflict',
        },
      ];
      expect(parseFieldsCapabilities(fieldCapabilities)).toEqual(expectedFields);
    });
    it('handles conflicts in nested fields', () => {
      const fieldCapabilities: FieldCapsResponse = {
        fields: {
          order: {
            nested: {
              aggregatable: false,
              metadata_field: false,
              searchable: false,
              type: 'nested',
            },
          },
          'order.id': {
            number: {
              aggregatable: false,
              indices: ['index-002'],
              metadata_field: false,
              searchable: false,
              type: 'number',
            },
            text: {
              aggregatable: false,
              indices: ['index-001'],
              metadata_field: false,
              searchable: true,
              type: 'text',
            },
          },
        },
        indices: ['index-001', 'index-002'],
      };
      const expectedFields: SchemaField[] = [
        {
          aggregatable: false,
          indices: [
            {
              name: 'index-001',
              type: 'nested',
            },
            {
              name: 'index-002',
              type: 'nested',
            },
          ],
          metadata_field: false,
          name: 'order',
          searchable: false,
          type: 'nested',
        },
        {
          aggregatable: false,
          indices: [
            {
              name: 'index-001',
              type: 'text',
            },
            {
              name: 'index-002',
              type: 'number',
            },
          ],
          metadata_field: false,
          name: 'order.id',
          searchable: true,
          type: 'conflict',
        },
      ];
      expect(parseFieldsCapabilities(fieldCapabilities)).toEqual(expectedFields);
    });
  });
});
