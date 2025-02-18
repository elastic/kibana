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

    it('normalizes filters with all fields present', () => {
      const extractedKqlQuery = extractRuleKqlQuery(
        'event.kind:alert',
        'kuery',
        [mockFilter],
        undefined
      );

      expect(extractedKqlQuery).toEqual(
        expect.objectContaining({
          filters: [
            {
              meta: {
                negate: false,
                disabled: false,
              },
              query: {
                term: {
                  field: 'value',
                },
              },
            },
          ],
        })
      );
    });

    it('normalizes filters without disabled field', () => {
      const extractedKqlQuery = extractRuleKqlQuery(
        'event.kind:alert',
        'kuery',
        [{ ...mockFilter, meta: { ...mockFilter.meta, disabled: undefined } }],
        undefined
      );

      expect(extractedKqlQuery).toEqual(
        expect.objectContaining({
          filters: [
            {
              meta: {
                negate: false,
                disabled: false,
              },
              query: {
                term: {
                  field: 'value',
                },
              },
            },
          ],
        })
      );
    });

    it('normalizes filters without negate field', () => {
      const extractedKqlQuery = extractRuleKqlQuery(
        'event.kind:alert',
        'kuery',
        [{ ...mockFilter, meta: { ...mockFilter.meta, negate: undefined } }],
        undefined
      );

      expect(extractedKqlQuery).toEqual(
        expect.objectContaining({
          filters: [
            {
              meta: {
                disabled: false,
              },
              query: {
                term: {
                  field: 'value',
                },
              },
            },
          ],
        })
      );
    });

    it('normalizes filters without meta object', () => {
      const extractedKqlQuery = extractRuleKqlQuery(
        'event.kind:alert',
        'kuery',
        [{ ...mockFilter, meta: undefined }],
        undefined
      );

      expect(extractedKqlQuery).toEqual(
        expect.objectContaining({
          filters: [
            {
              query: {
                term: {
                  field: 'value',
                },
              },
            },
          ],
        })
      );
    });

    it('normalizes filters without query object', () => {
      const extractedKqlQuery = extractRuleKqlQuery(
        'event.kind:alert',
        'kuery',
        [{ ...mockFilter, query: undefined }],
        undefined
      );

      expect(extractedKqlQuery).toEqual(
        expect.objectContaining({
          filters: [
            {
              meta: {
                negate: false,
                disabled: false,
              },
            },
          ],
        })
      );
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
