/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { OriginalRule } from '../../../../../../common/siem_migrations/model/rule_migration.gen';
import { getElasticSeverityFromOriginalRule } from './map_splunk_severity_elastic';

const defaultSplunkRule: OriginalRule = {
  id: 'some_id',
  vendor: 'splunk',
  title: 'Sample Alert in Essentials',
  description: '',
  query: 'source="tutorialdata.zip:*"',
  query_language: 'spl',
  severity: '3',
};

describe('getElasticSeverityFromOriginalRule', () => {
  describe('splunk', () => {
    describe('when there is a match', () => {
      const tests: Array<{
        input: OriginalRule;
        expected: string;
      }> = [
        {
          input: {
            ...defaultSplunkRule,
            severity: '1',
          },
          expected: 'low',
        },
        {
          input: {
            ...defaultSplunkRule,
            severity: '2',
          },
          expected: 'low',
        },
        {
          input: {
            ...defaultSplunkRule,
            severity: '3',
          },
          expected: 'medium',
        },
        {
          input: {
            ...defaultSplunkRule,
            severity: '4',
          },
          expected: 'high',
        },
        {
          input: {
            ...defaultSplunkRule,
            severity: '5',
          },
          expected: 'critical',
        },
      ];

      tests.forEach((test) => {
        it(`should maps severity ${test.input.severity} to ${test.expected}`, () => {
          expect(getElasticSeverityFromOriginalRule(test.input)).toEqual(test.expected);
        });
      });
    });
    describe('when there is no match', () => {
      it('should return default severity when there is no match', () => {
        expect(
          getElasticSeverityFromOriginalRule({
            ...defaultSplunkRule,
            severity: 'an_invalid_severity',
          })
        ).toEqual('low');
      });

      it('should return default severity when there is no severity', () => {
        expect(
          getElasticSeverityFromOriginalRule({
            ...defaultSplunkRule,
            severity: undefined,
          })
        ).toEqual('low');
      });
    });
  });
});
