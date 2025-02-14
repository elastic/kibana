/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { OriginalRule } from '../../../../../../common/siem_migrations/model/rule_migration.gen';
import { getElasticRiskScoreFromOriginalRule } from './map_original_rule_risk_score_elastic';

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
            // @ts-expect-error
            vendor: 'not_splunk',
            query_language: 'not_spl',
          })
        ).toEqual(21);
      });
    });
  });
});
