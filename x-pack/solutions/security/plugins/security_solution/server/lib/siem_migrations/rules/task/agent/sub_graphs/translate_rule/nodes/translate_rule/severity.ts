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
} from '../../../../../../../../../../common/siem_migrations/constants';
import { SPLUNK_ELASTIC_ALERT_SEVERITY_MAP } from '../../../../../../../constants';
import type { SplunkSeverity } from '../../../../../../../../../../common/siem_migrations/types';
import type { OriginalRule } from '../../../../../../../../../../common/siem_migrations/model/rule_migration.gen';

export const mapSplunkSeverityToElasticSeverity = (
  splunkSeverity?: keyof SplunkSeverity
): Severity => {
  if (!splunkSeverity) {
    return DEFAULT_TRANSLATION_SEVERITY;
  }
  return SPLUNK_ELASTIC_ALERT_SEVERITY_MAP[splunkSeverity] || DEFAULT_TRANSLATION_SEVERITY;
};

export const getElasticSeverityFromOriginalRule = (originalRule: OriginalRule) => {
  return originalRule.query_language === 'spl' || originalRule.vendor === 'splunk'
    ? mapSplunkSeverityToElasticSeverity(originalRule.severity as keyof SplunkSeverity)
    : DEFAULT_TRANSLATION_SEVERITY;
};

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
