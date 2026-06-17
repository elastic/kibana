/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  APM_ERROR_COUNT_RULE_TYPE_ID,
  APM_TRANSACTION_DURATION_INDICATOR,
  APM_TRANSACTION_DURATION_RULE_TYPE_ID,
  APM_TRANSACTION_ERROR_RATE_INDICATOR,
  APM_TRANSACTION_ERROR_RATE_RULE_TYPE_ID,
  buildAlertRulePreviews,
  buildRecommendedRules,
  buildRecommendedSlos,
  buildSloPreviews,
  ENVIRONMENT_ALL,
  KQL_CUSTOM_INDICATOR,
  LOG_DOCUMENT_COUNT_RULE_TYPE_ID,
  METRIC_INVENTORY_THRESHOLD_RULE_TYPE_ID,
  METRIC_THRESHOLD_RULE_TYPE_ID,
  SLO_ALL_VALUE,
} from './recommended_config';

describe('buildRecommendedRules', () => {
  it('creates APM, logs, and infra rules for the recommended preset', () => {
    const rules = buildRecommendedRules({ environment: 'dev' });

    expect(rules.map((rule) => rule.rule_type_id)).toEqual([
      APM_TRANSACTION_ERROR_RATE_RULE_TYPE_ID,
      APM_TRANSACTION_DURATION_RULE_TYPE_ID,
      APM_ERROR_COUNT_RULE_TYPE_ID,
      METRIC_THRESHOLD_RULE_TYPE_ID,
      METRIC_INVENTORY_THRESHOLD_RULE_TYPE_ID,
      LOG_DOCUMENT_COUNT_RULE_TYPE_ID,
    ]);
    rules.slice(0, 3).forEach((rule) => {
      expect(rule.consumer).toBe('apm');
      expect(rule.params.environment).toBe('dev');
    });
  });

  it('creates only APM rules for the loose preset', () => {
    const rules = buildRecommendedRules({ environment: 'dev', preset: 'loose' });
    expect(rules).toHaveLength(2);
    expect(rules.every((rule) => rule.consumer === 'apm')).toBe(true);
  });

  it('creates an extra spike rule for the strict preset', () => {
    const rules = buildRecommendedRules({ environment: 'dev', preset: 'strict' });
    expect(rules).toHaveLength(7);
    expect(
      rules.filter((rule) => rule.rule_type_id === APM_TRANSACTION_DURATION_RULE_TYPE_ID)
    ).toHaveLength(2);
  });
});

describe('buildRecommendedSlos', () => {
  it('uses the ALL sentinel for the SLO environment when ENVIRONMENT_ALL is selected', () => {
    const slos = buildRecommendedSlos({ environment: ENVIRONMENT_ALL });

    expect(slos.map((slo) => slo.indicator.type)).toEqual([
      APM_TRANSACTION_ERROR_RATE_INDICATOR,
      APM_TRANSACTION_DURATION_INDICATOR,
      KQL_CUSTOM_INDICATOR,
    ]);
    slos.slice(0, 2).forEach((slo) => {
      expect(slo.indicator.params.environment).toBe(SLO_ALL_VALUE);
    });
    expect(slos[0].objective.target).toBe(0.99);
  });

  it('passes the concrete environment through to APM SLO indicators', () => {
    const slos = buildRecommendedSlos({ environment: 'production' });
    slos.slice(0, 2).forEach((slo) => {
      expect(slo.indicator.params.environment).toBe('production');
    });
  });

  it('creates a single APM SLO for the loose preset', () => {
    const slos = buildRecommendedSlos({ environment: 'dev', preset: 'loose' });
    expect(slos).toHaveLength(1);
    expect(slos[0].objective.target).toBe(0.95);
  });
});

describe('preview builders', () => {
  it('returns preview rows aligned with generated resources', () => {
    const target = { environment: 'staging', preset: 'recommended' as const };
    expect(buildAlertRulePreviews(target)).toHaveLength(buildRecommendedRules(target).length);
    expect(buildSloPreviews(target)).toHaveLength(buildRecommendedSlos(target).length);
  });

  it('tags every preview row with a data type', () => {
    const target = { environment: 'staging', preset: 'recommended' as const };
    buildAlertRulePreviews(target).forEach((preview) => {
      expect(preview.dataType).toBeDefined();
    });
    buildSloPreviews(target).forEach((preview) => {
      expect(preview.dataType).toBeDefined();
    });
  });
});
