/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SplunkSeverity } from '../../../../../../common/siem_migrations/types';
import { mapSplunkSeverityToElasticSeverity } from './splunk';

describe('mapSplunkSeverityToElasticSeverity', () => {
  describe('when there is a match', () => {
    const tests: Array<{
      input: keyof SplunkSeverity;
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
        mapSplunkSeverityToElasticSeverity('an_invalid_severity' as unknown as keyof SplunkSeverity)
      ).toEqual('low');
    });

    it('should return default severity when there is no severity', () => {
      expect(mapSplunkSeverityToElasticSeverity()).toEqual('low');
    });
  });
});
