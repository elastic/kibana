/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Severity } from '@kbn/securitysolution-io-ts-alerting-types';
import {
  DEFAULT_TRANSLATION_SEVERITY,
  ELASTIC_SEVERITY_TO_RISK_SCORE_MAP,
} from '../../../../../../common/siem_migrations/constants';
import type { OriginalRule } from '../../../../../../common/siem_migrations/model/rule_migration.gen';
import { getElasticSeverityFromOriginalRule } from './map_original_rule_severity_elastic';

export const getElasticRiskScoreFromElasticSeverity = (elasticSeverity: Severity) => {
  return ELASTIC_SEVERITY_TO_RISK_SCORE_MAP[elasticSeverity];
};

export const getElasticRiskScoreFromOriginalRule = (originalRule: OriginalRule) => {
  if (originalRule.vendor === 'splunk') {
    const elasticSeverity = getElasticSeverityFromOriginalRule(originalRule);
    return getElasticRiskScoreFromElasticSeverity(elasticSeverity);
  }
  return ELASTIC_SEVERITY_TO_RISK_SCORE_MAP[DEFAULT_TRANSLATION_SEVERITY];
};
