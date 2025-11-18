/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KqlQueryType } from '../../../../api/detection_engine';
import {
  extractRuleEqlQuery,
  extractRuleEsqlQuery,
  extractRuleKqlQuery,
} from './extract_rule_data_query';

describe('extract rule data queries', () => {
  describe('extractRuleKqlQuery', () => {
    it('extracts the query field for inline query types', () => {
      const extractedKqlQuery = extractRuleKqlQuery('event.kind:alert', 'kuery', [], undefined);

      expect(extractedKqlQuery).toEqual({
        type: KqlQueryType.inline_query,
        query: 'event.kind:alert',
        language: 'kuery',
        filters: [],
      });
    });
  });

  describe('extractRuleEqlQuery', () => {
    it('extracts the EQL query field', () => {
      const extractedEqlQuery = extractRuleEqlQuery({
        query: 'query where true',
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
    it('extracts the ESQL query field', () => {
      const extractedEsqlQuery = extractRuleEsqlQuery('FROM * where true', 'esql');

      expect(extractedEsqlQuery).toEqual({
        query: 'FROM * where true',
        language: 'esql',
      });
    });
  });
});
