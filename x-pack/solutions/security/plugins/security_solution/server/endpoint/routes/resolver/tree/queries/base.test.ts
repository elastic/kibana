/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BaseResolverQuery } from './base';
import type { ResolverSchema } from '../../../../../../common/endpoint/types';

describe('BaseResolverQuery', () => {
  const indexPatterns = ['logs-*'];
  const timeRange = { from: '2023-01-01T00:00:00.000Z', to: '2023-01-02T00:00:00.000Z' };

  describe('resolverFields generation', () => {
    it('should include process.name field when present in schema', () => {
      const schemaWithName: ResolverSchema = {
        id: 'process.entity_id',
        parent: 'process.parent.entity_id',
        name: 'process.name',
        agentId: 'agent.id',
      };

      const query = new BaseResolverQuery({
        schema: schemaWithName,
        indexPatterns,
        timeRange,
        isInternalRequest: false,
        shouldExcludeColdAndFrozenTiers: false,
      });

      expect(query.resolverFields).toEqual(expect.arrayContaining([{ field: 'process.name' }]));
    });

    it('should not include process.name field when not present in schema', () => {
      const schemaWithoutName: ResolverSchema = {
        id: 'process.entity_id',
        parent: 'process.parent.entity_id',
        agentId: 'agent.id',
      };

      const query = new BaseResolverQuery({
        schema: schemaWithoutName,
        indexPatterns,
        timeRange,
        isInternalRequest: false,
        shouldExcludeColdAndFrozenTiers: false,
      });

      const processNameField = query.resolverFields.find(
        (field: any) => field.field === 'process.name'
      );
      expect(processNameField).toBeUndefined();
    });

    it('should include standard fields for endpoint schema', () => {
      const endpointSchema: ResolverSchema = {
        id: 'process.entity_id',
        parent: 'process.parent.entity_id',
        ancestry: 'process.Ext.ancestry',
        name: 'process.name',
        agentId: 'agent.id',
      };

      const query = new BaseResolverQuery({
        schema: endpointSchema,
        indexPatterns,
        timeRange,
        isInternalRequest: false,
        shouldExcludeColdAndFrozenTiers: false,
      });

      expect(query.resolverFields).toEqual(
        expect.arrayContaining([
          { field: 'process.entity_id' },
          { field: 'process.parent.entity_id' },
          { field: 'process.name' },
          { field: 'agent.id' },
        ])
      );
    });

    it('should include standard fields for non-endpoint schema with name', () => {
      const nonEndpointSchema: ResolverSchema = {
        id: 'process.entity_id',
        parent: 'process.parent.entity_id',
        name: 'process.name',
        agentId: 'agent.id',
      };

      const query = new BaseResolverQuery({
        schema: nonEndpointSchema,
        indexPatterns,
        timeRange,
        isInternalRequest: false,
        shouldExcludeColdAndFrozenTiers: false,
      });

      expect(query.resolverFields).toEqual(
        expect.arrayContaining([
          { field: 'process.entity_id' },
          { field: 'process.parent.entity_id' },
          { field: 'process.name' },
          { field: 'agent.id' },
        ])
      );
    });

    it('should handle schema without agentId', () => {
      const schemaWithoutAgent: ResolverSchema = {
        id: 'process.entity_id',
        parent: 'process.parent.entity_id',
        name: 'process.name',
      };

      const query = new BaseResolverQuery({
        schema: schemaWithoutAgent,
        indexPatterns,
        timeRange,
        isInternalRequest: false,
        shouldExcludeColdAndFrozenTiers: false,
      });

      expect(query.resolverFields).toEqual([
        { field: '@timestamp' },
        { field: 'process.entity_id' },
        { field: 'process.parent.entity_id' },
        { field: 'process.name' },
      ]);
    });

    it('should use default schema when none provided', () => {
      // Test the default schema behavior
      const query = new BaseResolverQuery({
        schema: undefined,
        indexPatterns,
        timeRange,
        isInternalRequest: false,
        shouldExcludeColdAndFrozenTiers: false,
      });

      // Default schema should include process.name according to the changes
      expect(query.resolverFields).toEqual(
        expect.arrayContaining([
          { field: 'process.entity_id' },
          { field: 'process.parent.entity_id' },
        ])
      );
    });
  });

  describe('time range filtering', () => {
    it('should generate correct time range filter', () => {
      const schema: ResolverSchema = {
        id: 'process.entity_id',
        parent: 'process.parent.entity_id',
        agentId: 'agent.id',
      };

      const query = new BaseResolverQuery({
        schema,
        indexPatterns,
        timeRange,
        isInternalRequest: false,
        shouldExcludeColdAndFrozenTiers: false,
      });

      const rangeFilter = query.getRangeFilter();

      expect(rangeFilter).toEqual([
        {
          range: {
            '@timestamp': {
              gte: '2023-01-01T00:00:00.000Z',
              lte: '2023-01-02T00:00:00.000Z',
              format: 'strict_date_optional_time',
            },
          },
        },
      ]);
    });
  });

  describe('cold and frozen tier filtering', () => {
    it('should include cold and frozen tier filter when enabled', () => {
      const schema: ResolverSchema = {
        id: 'process.entity_id',
        parent: 'process.parent.entity_id',
        agentId: 'agent.id',
      };

      const query = new BaseResolverQuery({
        schema,
        indexPatterns,
        timeRange,
        isInternalRequest: false,
        shouldExcludeColdAndFrozenTiers: true,
      });

      const coldFrozenFilter = query.getColdAndFrozenTierFilter();

      expect(coldFrozenFilter).toEqual([
        {
          bool: {
            must_not: {
              terms: {
                _tier: ['data_frozen', 'data_cold'],
              },
            },
          },
        },
      ]);
    });

    it('should not include cold and frozen tier filter when disabled', () => {
      const schema: ResolverSchema = {
        id: 'process.entity_id',
        parent: 'process.parent.entity_id',
        agentId: 'agent.id',
      };

      const query = new BaseResolverQuery({
        schema,
        indexPatterns,
        timeRange,
        isInternalRequest: false,
        shouldExcludeColdAndFrozenTiers: false,
      });

      const coldFrozenFilter = query.getColdAndFrozenTierFilter();

      expect(coldFrozenFilter).toEqual([]);
    });
  });
});
