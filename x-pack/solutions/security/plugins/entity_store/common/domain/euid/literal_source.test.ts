/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityDefinitionWithoutId, FieldEvaluation } from '../definitions/entity_schema';
import { getSourceFieldNames } from './commons';
import { applyFieldEvaluations, getSourceMatchSpec } from './field_evaluations';
import { getFieldEvaluationsEsqlFromDefinition } from './esql';

const literalEvaluation: FieldEvaluation = {
  destination: 'entity.ki_stream_name',
  sources: [{ literal: 'logs.ecs.nginx' }],
  fallbackValue: null,
  whenClauses: [],
};

const literalWithEscaping: FieldEvaluation = {
  destination: 'entity.tag',
  sources: [{ literal: 'a"b\\c' }],
  fallbackValue: null,
  whenClauses: [],
};

const literalAsFallback: FieldEvaluation = {
  destination: 'entity.namespace',
  sources: [{ field: 'event.module' }, { literal: 'unknown' }],
  fallbackValue: null,
  whenClauses: [],
};

describe('field evaluation: literal source', () => {
  describe('applyFieldEvaluations (in-memory)', () => {
    it('uses the literal as the destination value when it is the only source', () => {
      expect(applyFieldEvaluations({}, [literalEvaluation])).toEqual({
        'entity.ki_stream_name': 'logs.ecs.nginx',
      });
    });

    it('preserves the literal value verbatim regardless of document content', () => {
      expect(applyFieldEvaluations({ event: { module: 'aws' } }, [literalEvaluation])).toEqual({
        'entity.ki_stream_name': 'logs.ecs.nginx',
      });
    });

    it('uses the literal as a fallback when the prior field source resolves to nothing', () => {
      expect(applyFieldEvaluations({}, [literalAsFallback])).toEqual({
        'entity.namespace': 'unknown',
      });
      expect(applyFieldEvaluations({ event: { module: '' } }, [literalAsFallback])).toEqual({
        'entity.namespace': 'unknown',
      });
    });

    it('prefers an earlier field source over a literal fallback when the field resolves', () => {
      expect(applyFieldEvaluations({ event: { module: 'aws' } }, [literalAsFallback])).toEqual({
        'entity.namespace': 'aws',
      });
    });

    it('passes special characters through without altering them in memory', () => {
      expect(applyFieldEvaluations({}, [literalWithEscaping])).toEqual({
        'entity.tag': 'a"b\\c',
      });
    });
  });

  describe('getSourceMatchSpec', () => {
    it('returns the literal value as the matched single value', () => {
      expect(getSourceMatchSpec({}, literalEvaluation)).toEqual({
        type: 'values',
        values: ['logs.ecs.nginx'],
      });
    });

    it('still returns the field value when an earlier field source resolves', () => {
      expect(getSourceMatchSpec({ event: { module: 'aws' } }, literalAsFallback)).toEqual({
        type: 'values',
        values: ['aws'],
      });
    });

    it('falls back to the literal value when prior field sources do not resolve', () => {
      expect(getSourceMatchSpec({}, literalAsFallback)).toEqual({
        type: 'values',
        values: ['unknown'],
      });
    });
  });

  describe('getSourceFieldNames', () => {
    it('treats a single literal source as contributing no document field names', () => {
      expect(getSourceFieldNames(literalEvaluation.sources)).toEqual({
        exactMatchFields: [],
        prefixMatchFields: [],
      });
    });

    it('only collects document-field source names when literals are mixed in', () => {
      expect(getSourceFieldNames(literalAsFallback.sources)).toEqual({
        exactMatchFields: ['event.module'],
        prefixMatchFields: [],
      });
    });

    it('does not classify a literal source as a prefix-match (firstChunkOfField) source', () => {
      expect(
        getSourceFieldNames([
          { literal: 'a' },
          { firstChunkOfField: 'data_stream.dataset', splitBy: '.' },
        ])
      ).toEqual({ exactMatchFields: [], prefixMatchFields: ['data_stream.dataset'] });
    });
  });

  describe('getFieldEvaluationsEsqlFromDefinition (ESQL)', () => {
    const buildDefinitionWith = (
      fieldEvaluations: FieldEvaluation[]
    ): EntityDefinitionWithoutId => ({
      name: 'literal_test',
      type: 'generic',
      fields: [],
      fieldEvaluations,
      indexPatterns: ['logs.ecs.nginx'],
      identityField: { singleField: 'entity.id', skipTypePrepend: true },
    });

    it('renders a single literal source as a quoted ESQL string assigned to the source variable', () => {
      const result = getFieldEvaluationsEsqlFromDefinition(
        buildDefinitionWith([literalEvaluation])
      );
      expect(result).toBeDefined();
      expect(result).toContain('_src_entity_ki_stream_name = "logs.ecs.nginx"');
      expect(result).toContain('entity.ki_stream_name = CASE(');
    });

    it('escapes embedded quotes and backslashes in literal values', () => {
      const result = getFieldEvaluationsEsqlFromDefinition(
        buildDefinitionWith([literalWithEscaping])
      );
      expect(result).toBeDefined();
      expect(result).toContain('_src_entity_tag = "a\\"b\\\\c"');
    });

    it('renders a literal as a fallback in a multi-source CASE chain', () => {
      const result = getFieldEvaluationsEsqlFromDefinition(
        buildDefinitionWith([literalAsFallback])
      );
      expect(result).toBeDefined();
      expect(result).toContain('_src_entity_namespace0 = MV_FIRST(event.module)');
      expect(result).toContain('_src_entity_namespace1 = "unknown"');
      expect(result).toContain('_src_entity_namespace = CASE(');
    });
  });
});
