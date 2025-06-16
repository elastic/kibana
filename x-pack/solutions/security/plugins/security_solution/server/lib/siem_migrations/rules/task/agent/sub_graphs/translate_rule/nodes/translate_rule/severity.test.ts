/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SplunkSeverity } from '../../../../../../types';
import type { OriginalRule } from '../../../../../../../../../../common/siem_migrations/model/rule_migration.gen';
import {
  getElasticRiskScoreFromOriginalRule,
  getElasticSeverityFromOriginalRule,
  mapSplunkSeverityToElasticSeverity,
} from './severity';

const defaultSplunkRule: OriginalRule = {
  id: 'some_id',
  vendor: 'splunk',
  title: 'Sample Alert in Essentials',
  description: '',
  query: 'source="tutorialdata.zip:*"',
  query_language: 'spl',
  severity: '3',
};

describe('tests', () => {
  describe('getElasticRiskScoreFromOriginalRule', () => {
    describe('splunk', () => {
      describe('when there is a vendor match', () => {
        it('should return the correct risk score', () => {
          const riskScore = getElasticRiskScoreFromOriginalRule(defaultSplunkRule);
          expect(riskScore).toEqual(47);
        });
      });
      describe('when there is no vendor match', () => {
        it('should return default risk score', () => {
          expect(
            getElasticRiskScoreFromOriginalRule({
              ...defaultSplunkRule,
              /* @ts-expect-error because vendor type is "splunk" which raises error below */
              vendor: 'not_splunk',
              query_language: 'not_spl',
            })
          ).toEqual(21);
        });
      });
    });
  });

  describe('mapSplunkSeverityToElasticSeverity', () => {
    describe('when there is a match', () => {
      const tests: Array<{
        input: SplunkSeverity;
        expected: string;
      }> = [
        {
          input: '1',
          expected: 'low',
        },
        {
          input: '2',
          expected: 'low',
        },
        {
          input: '3',
          expected: 'medium',
        },
        {
          input: '4',
          expected: 'high',
        },
        {
          input: '5',
          expected: 'critical',
        },
      ];

      tests.forEach((test) => {
        it(`should maps severity ${test.input} to ${test.expected}`, () => {
          expect(mapSplunkSeverityToElasticSeverity(test.input)).toEqual(test.expected);
        });
      });
    });
    describe('when there is no match', () => {
      it('should return default severity when there is no match', () => {
        expect(
          mapSplunkSeverityToElasticSeverity('an_invalid_severity' as unknown as SplunkSeverity)
        ).toEqual('low');
      });

      it('should return default severity when there is no severity', () => {
        expect(mapSplunkSeverityToElasticSeverity()).toEqual('low');
      });
    });
  });

  describe('getElasticSeverityFromOriginalRule', () => {
    describe('splunk', () => {
      describe('when there is a vendor match', () => {
        it('should call the correct function with the correct severity', () => {
          expect(getElasticSeverityFromOriginalRule(defaultSplunkRule)).toBe('medium');
        });
      });
      describe('when there is no vendor match', () => {
        it('should return default severity when there is no match', () => {
          expect(
            getElasticSeverityFromOriginalRule({
              ...defaultSplunkRule,
              /* @ts-expect-error because vendor type is "splunk" which raises error below */
              vendor: undefined,
              query_language: 'not_spl',
            })
          ).toEqual('low');
        });

        it('should return default severity when there is no severity', () => {
          expect(
            getElasticSeverityFromOriginalRule({
              ...defaultSplunkRule,
              severity: undefined,
            })
          ).toBe('low');
        });
      });
    });
  });
});
