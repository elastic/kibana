/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import {
  generateApiSchemaDoc,
  generateOperationsDoc,
  generateOperationsUsageList,
  generateSloIndicatorsDoc,
  generateObjectiveDoc,
  getDescribedEnumValues,
  SchemaTranslationError,
} from './schema_to_skill_docs';
import { sloBudgetingMethodSchema } from '../tools/manage_slo/schemas';

describe('schema_to_skill_docs', () => {
  describe('generateApiSchemaDoc', () => {
    const exampleApiSchema = z.object({
      name: z.string().min(1).max(64).describe('Display name.'),
      enabled: z.boolean().optional().describe('Whether the resource is enabled.'),
    });

    it('renders title and top-level field table', () => {
      const doc = generateApiSchemaDoc({
        title: 'Example API Schema Reference',
        schema: exampleApiSchema,
      });

      expect(doc).toContain('# Example API Schema Reference');
      expect(doc).toContain('## Top-Level Fields');
      expect(doc).toContain(
        '| `name` | string | required | Display name. (min length: 1, max length: 64) |'
      );
      expect(doc).toContain(
        '| `enabled` | boolean | optional | Whether the resource is enabled. |'
      );
    });

    it('escapes union separators so each cell stays a single table column', () => {
      const doc = generateApiSchemaDoc({
        title: 'Enum Example',
        schema: z.object({ mode: z.enum(['a', 'b', 'c']).describe('Mode.') }),
      });

      const rows = doc.split('\n').filter((line) => line.startsWith('| `mode`'));
      expect(rows).toEqual([
        '| `mode` | "a" \\| "b" \\| "c" | required | Mode. (enum: a \\| b \\| c) |',
      ]);
      expect(rows[0].split(/(?<!\\)\|/).length - 2).toBe(4);
    });
  });

  describe('generateOperationsDoc with custom discriminatorKey', () => {
    const exampleOpSchema = z.discriminatedUnion('type', [
      z
        .object({ type: z.literal('foo'), value: z.string().describe('A string value.') })
        .describe('Foo operation: do the foo thing.'),
      z
        .object({ type: z.literal('bar'), count: z.number().describe('A number.') })
        .describe('Bar operation: do the bar thing.'),
    ]);

    it('renders per-variant sections using custom discriminatorKey', () => {
      const doc = generateOperationsDoc({
        title: 'Example Operations',
        schema: exampleOpSchema,
        discriminatorKey: 'type',
      });

      expect(doc).toContain('# Example Operations');
      expect(doc).toContain('`type: "foo"`');
      expect(doc).toContain('`type: "bar"`');
      expect(doc).toContain('Foo operation');
      expect(doc).toContain('Bar operation');
    });

    it('throws SchemaTranslationError when a variant lacks a top-level .describe()', () => {
      const badSchema = z.discriminatedUnion('type', [
        z.object({ type: z.literal('missing'), value: z.string() }),
      ]);

      expect(() =>
        generateOperationsDoc({
          title: 'Bad Schema',
          schema: badSchema,
          discriminatorKey: 'type',
        })
      ).toThrow(SchemaTranslationError);
    });

    it('generateOperationsUsageList returns bullet list of variant describes', () => {
      const list = generateOperationsUsageList({
        title: 'Example Operations',
        schema: exampleOpSchema,
        discriminatorKey: 'type',
      });

      expect(list).toContain('- Foo operation');
      expect(list).toContain('- Bar operation');
    });
  });

  describe('getDescribedEnumValues', () => {
    it('returns both values with non-empty descriptions from sloBudgetingMethodSchema', () => {
      const values = getDescribedEnumValues(sloBudgetingMethodSchema, 'sloBudgetingMethodSchema');

      expect(values).toHaveLength(2);
      expect(values[0].value).toBe('occurrences');
      expect(values[0].description.length).toBeGreaterThan(0);
      expect(values[1].value).toBe('timeslices');
      expect(values[1].description.length).toBeGreaterThan(0);
    });

    it('throws when a union literal has no description', () => {
      const badSchema = z.union([
        z.literal('a').describe('described'),
        z.literal('b'), // no description
      ]);
      expect(() => getDescribedEnumValues(badSchema, 'badSchema')).toThrow(SchemaTranslationError);
    });

    it('throws when schema is not a union', () => {
      expect(() => getDescribedEnumValues(z.string(), 'notUnion')).toThrow(SchemaTranslationError);
    });
  });

  describe('generateSloIndicatorsDoc', () => {
    it('matches snapshot', () => {
      expect(generateSloIndicatorsDoc()).toMatchSnapshot();
    });

    it('contains all 7 indicator type labels', () => {
      const doc = generateSloIndicatorsDoc();
      const types = [
        'sli.apm.transactionDuration',
        'sli.apm.transactionErrorRate',
        'sli.synthetics.availability',
        'sli.kql.custom',
        'sli.metric.custom',
        'sli.metric.timeslice',
        'sli.histogram.custom',
      ];
      for (const type of types) {
        expect(doc).toContain(type);
      }
    });

    it('does not contain locked-restriction fields', () => {
      const doc = generateSloIndicatorsDoc();
      expect(doc).not.toContain('dataViewId');
      expect(doc).not.toContain('kqlWithFilters');
      expect(doc).not.toContain('projectRoutings');
    });
  });

  describe('generateObjectiveDoc', () => {
    it('matches snapshot', () => {
      expect(generateObjectiveDoc()).toMatchSnapshot();
    });

    it('contains required terms', () => {
      const doc = generateObjectiveDoc();
      expect(doc).toContain('occurrences');
      expect(doc).toContain('timeslices');
      expect(doc).toContain('7d');
      expect(doc).toContain('1M');
      expect(doc).toContain('timesliceTarget');
    });
  });
});
