/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FilterStateStore, type Filter } from '@kbn/es-query';
import { KqlQueryType } from '../../../api/detection_engine';
import {
  extractRuleEqlQuery,
  extractRuleEsqlQuery,
  extractRuleKqlQuery,
} from './extract_rule_data_query';

const mockFilter: Filter = {
  meta: {
    alias: null,
    negate: false,
    disabled: false,
    type: 'phrase',
    key: 'test',
    params: {
      query: 'value',
    },
  },
  query: {
    term: {
      field: 'value',
    },
  },
  $state: {
    store: FilterStateStore.APP_STATE,
  },
};

describe('extract rule data queries', () => {
  describe('extractRuleKqlQuery', () => {
    it('extracts a trimmed version of the query field for inline query types', () => {
      const extractedKqlQuery = extractRuleKqlQuery('\nevent.kind:alert\n', 'kuery', [], undefined);

      expect(extractedKqlQuery).toEqual({
        type: KqlQueryType.inline_query,
        query: 'event.kind:alert',
        language: 'kuery',
        filters: [],
      });
    });

    describe('filters normalization', () => {
      it('normalizes filters[].query when all fields present', () => {
        const extractedKqlQuery = extractRuleKqlQuery(
          'some:query',
          'kuery',
          [mockFilter],
          undefined
        );

        expect(extractedKqlQuery).toMatchObject({
          filters: [
            {
              query: {
                term: {
                  field: 'value',
                },
              },
            },
          ],
        });
      });

      it('normalizes filters[].query when query object is missing', () => {
        const extractedKqlQuery = extractRuleKqlQuery(
          'some:query',
          'kuery',
          [{ ...mockFilter, query: undefined }],
          undefined
        );

        expect(extractedKqlQuery).not.toMatchObject({
          filters: [
            {
              query: expect.anything(),
            },
          ],
        });
      });

      it.each([
        {
          caseName: 'when all fields present',
          filter: mockFilter,
          expectedFilterMeta: {
            negate: false,
            disabled: false,
          },
        },
        {
          caseName: 'when disabled field is missing',
          filter: { ...mockFilter, meta: { ...mockFilter.meta, disabled: undefined } },
          expectedFilterMeta: {
            negate: false,
            disabled: false,
          },
        },
        {
          caseName: 'when negate field is missing',
          filter: { ...mockFilter, meta: { ...mockFilter.meta, negate: undefined } },
          expectedFilterMeta: {
            disabled: false,
          },
        },
        {
          caseName: 'when query object is missing',
          filter: { ...mockFilter, query: undefined },
          expectedFilterMeta: {
            negate: false,
            disabled: false,
          },
        },
      ])('normalizes filters[].meta $caseName', ({ filter, expectedFilterMeta }) => {
        const extractedKqlQuery = extractRuleKqlQuery('some:query', 'kuery', [filter], undefined);

        expect(extractedKqlQuery).toMatchObject({
          filters: [
            {
              meta: expectedFilterMeta,
            },
          ],
        });
      });

      it('normalizes filters[].meta when query object is missing', () => {
        const extractedKqlQuery = extractRuleKqlQuery(
          'some:query',
          'kuery',
          [{ ...mockFilter, query: undefined }],
          undefined
        );

        expect(extractedKqlQuery).toMatchObject({
          filters: [
            {
              meta: {
                negate: false,
                disabled: false,
              },
            },
          ],
        });
      });
    });
  });

  describe('extractRuleEqlQuery', () => {
    it('extracts a trimmed version of the query field', () => {
      const extractedEqlQuery = extractRuleEqlQuery({
        query: '\n\nquery where true\n\n',
        language: 'eql',
        filters: [],
        eventCategoryOverride: undefined,
        timestampField: undefined,
        tiebreakerField: undefined,
      });

      expect(extractedEqlQuery).toEqual({
        query: 'query where true',
        language: 'eql',
        filters: [],
        event_category_override: undefined,
        timestamp_field: undefined,
        tiebreaker_field: undefined,
      });
    });
  });

  describe('extractRuleEsqlQuery', () => {
    it('extracts a trimmed version of the query field', () => {
      const extractedEsqlQuery = extractRuleEsqlQuery('\nFROM * where true\t\n', 'esql');

      expect(extractedEsqlQuery).toEqual({
        query: 'FROM * where true',
        language: 'esql',
      });
    });
  });
});
