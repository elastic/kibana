/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fromKueryExpression } from '@kbn/es-query';
import { Comparator } from '../../../../../common/alerting/logs/log_threshold';
import { convertCriteriaToKQL } from '.';

describe('convertCriteriaToKQL', () => {
  const field = 'message';

  describe('quoting', () => {
    const cases: Array<[Comparator, string, string]> = [
      [Comparator.EQ, 'simple', `${field} : "simple"`],
      [Comparator.MATCH, 'simple', `${field} : "simple"`],
      [Comparator.MATCH_PHRASE, 'simple', `${field} : "simple"`],
      [Comparator.NOT_EQ, 'simple', `NOT ${field} : "simple"`],
      [Comparator.NOT_MATCH, 'simple', `NOT ${field} : "simple"`],
      [Comparator.NOT_MATCH_PHRASE, 'simple', `NOT ${field} : "simple"`],
    ];

    it.each(cases)('quotes the value for %s', (comparator, value, expected) => {
      expect(convertCriteriaToKQL({ field, comparator, value })).toBe(expected);
    });
  });

  describe('values containing KQL special characters', () => {
    // Regression test for https://github.com/elastic/kibana/issues/203071.
    // Phrase values containing characters such as `:` were previously
    // interpolated unquoted, producing unparseable KQL.
    const specialValues = [
      'foo: bar',
      'something with (parens)',
      'tag<value>',
      'wild*card',
      'has "inner" quotes',
      'back\\slash',
    ];

    it.each(specialValues)(
      'produces parseable KQL for "does not match phrase" with value %p',
      (value) => {
        const kql = convertCriteriaToKQL({
          field,
          comparator: Comparator.NOT_MATCH_PHRASE,
          value,
        });

        expect(() => fromKueryExpression(kql)).not.toThrow();
      }
    );

    it.each(specialValues)('produces parseable KQL for "matches phrase" with value %p', (value) => {
      const kql = convertCriteriaToKQL({
        field,
        comparator: Comparator.MATCH_PHRASE,
        value,
      });

      expect(() => fromKueryExpression(kql)).not.toThrow();
    });

    it('escapes embedded backslashes and double quotes', () => {
      const value = 'has "quote" and \\backslash';

      expect(
        convertCriteriaToKQL({
          field,
          comparator: Comparator.NOT_MATCH_PHRASE,
          value,
        })
      ).toBe(`NOT ${field} : "has \\"quote\\" and \\\\backslash"`);
    });
  });

  describe('range comparators', () => {
    it('renders numeric values without quotes', () => {
      expect(convertCriteriaToKQL({ field: 'count', comparator: Comparator.GT, value: 5 })).toBe(
        'count > 5'
      );
      expect(
        convertCriteriaToKQL({ field: 'count', comparator: Comparator.GT_OR_EQ, value: 5 })
      ).toBe('count >= 5');
      expect(convertCriteriaToKQL({ field: 'count', comparator: Comparator.LT, value: 5 })).toBe(
        'count < 5'
      );
      expect(
        convertCriteriaToKQL({ field: 'count', comparator: Comparator.LT_OR_EQ, value: 5 })
      ).toBe('count <= 5');
    });
  });

  describe('incomplete criteria', () => {
    it('returns an empty string when the value is missing', () => {
      expect(convertCriteriaToKQL({ field, comparator: Comparator.EQ })).toBe('');
    });

    it('returns an empty string when the comparator is missing', () => {
      expect(convertCriteriaToKQL({ field, value: 'x' })).toBe('');
    });

    it('returns an empty string when the field is missing', () => {
      expect(convertCriteriaToKQL({ comparator: Comparator.EQ, value: 'x' })).toBe('');
    });
  });
});
