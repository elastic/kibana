/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  FeatureTypeUsage,
  RulesTypeUsage,
} from '@kbn/security-solution-plugin/server/usage/detections/rules/types';
import expect from '@kbn/expect';

/**
 * Asserts that the sum of customized and non-customized rule counts equals the total rule count
 * for both enabled and disabled rules in the provided usage metrics.
 *
 * This function is intended to verify the internal consistency of rule usage telemetry,
 * ensuring that the following invariants hold:
 *   - `elastic_total.enabled === elastic_customized_total.enabled + elastic_noncustomized_total.enabled`
 *   - `elastic_total.disabled === elastic_customized_total.disabled + elastic_noncustomized_total.disabled`
 *
 * @param usage - The rule type usage metrics to validate.
 */
export function checkRuleTypeUsageCustomizationInvariant(usage: RulesTypeUsage) {
  expect(usage.elastic_total.enabled).to.eql(
    usage.elastic_customized_total.enabled + usage.elastic_noncustomized_total.enabled
  );
  expect(usage.elastic_total.disabled).to.eql(
    usage.elastic_customized_total.disabled + usage.elastic_noncustomized_total.disabled
  );
}

/**
 * Asserts that the provided rule usage metrics match the expected values for a specific metric type.
 *
 * This helper validates that the `elastic_total`, `elastic_customized_total`, and `elastic_noncustomized_total`
 * fields in the given `RulesTypeUsage` object have the expected counts for the specified metric (e.g., 'enabled' or 'disabled').
 *
 * @param usage - The rule type usage metrics object to validate.
 * @param metric - The key of the metric to check (e.g., 'enabled' or 'disabled'), corresponding to a property in {@link FeatureTypeUsage}.
 * @param expected - An object specifying the expected counts for:
 *   - `total`: The expected total count for the metric.
 *   - `customized`: The expected count of customized rules for the metric.
 *   - `noncustomized`: The expected count of non-customized rules for the metric.
 *
 * @example
 * checkRuleTypeUsageFields(usage, 'enabled', { total: 10, customized: 4, noncustomized: 6 });
 *
 * @throws AssertionError if any of the actual values do not match the expected values.
 */
export function checkRuleTypeUsageFields(
  usage: RulesTypeUsage,
  metric: keyof FeatureTypeUsage,
  expected: { total: number; customized: number; noncustomized: number }
) {
  expect(usage.elastic_total[metric]).to.eql(expected.total);
  expect(usage.elastic_customized_total[metric]).to.eql(expected.customized);
  expect(usage.elastic_noncustomized_total[metric]).to.eql(expected.noncustomized);
}
