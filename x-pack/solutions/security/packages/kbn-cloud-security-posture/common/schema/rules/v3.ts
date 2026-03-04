/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';
import { CSPM_POLICY_TEMPLATE, KSPM_POLICY_TEMPLATE } from '../../constants';

export const DEFAULT_BENCHMARK_RULES_PER_PAGE = 25;

// Since version 8.7.0

export type FindCspBenchmarkRuleRequest = TypeOf<typeof findCspBenchmarkRuleRequestSchema>;

export type CspBenchmarkRuleMetadata = TypeOf<typeof cspBenchmarkRuleMetadataSchema>;

export type CspBenchmarkRule = TypeOf<typeof cspBenchmarkRuleSchema>;

export const cspBenchmarkRuleMetadataSchema = schema.object({
  audit: schema.string(),
  benchmark: schema.object({
    name: schema.string(),
    posture_type: schema.maybe(
      schema.oneOf([schema.literal(CSPM_POLICY_TEMPLATE), schema.literal(KSPM_POLICY_TEMPLATE)])
    ),
    id: schema.string(),
    version: schema.string(),
    rule_number: schema.maybe(schema.string()),
  }),
  default_value: schema.maybe(schema.string()),
  description: schema.string(),
  id: schema.string(),
  impact: schema.maybe(schema.string()),
  name: schema.string(),
  profile_applicability: schema.string(),
  rationale: schema.string(),
  references: schema.maybe(schema.string()),
  reference: schema.maybe(schema.string()),
  rego_rule_id: schema.string(),
  remediation: schema.string(),
  section: schema.string(),
  // maxSize is set to 100 as it's not expected to have more than 100 tags per rule
  tags: schema.arrayOf(schema.string(), { maxSize: 100 }),
  version: schema.string(),
});

export const cspBenchmarkRuleSchema = schema.object({
  metadata: cspBenchmarkRuleMetadataSchema,
});

export const findCspBenchmarkRuleRequestSchema = schema.object({
  /**
   * An Elasticsearch simple_query_string
   */
  search: schema.maybe(schema.string()),

  /**
   * The page of objects to return
   */
  page: schema.number({ defaultValue: 1, min: 1 }),

  /**
   * The number of objects to include in each page
   */
  perPage: schema.number({ defaultValue: DEFAULT_BENCHMARK_RULES_PER_PAGE, min: 0 }),

  /**
   *  Fields to retrieve from CspBenchmarkRule saved object
   */
  // maxSize is set to 50 to cover all available fields with room for future additions
  fields: schema.maybe(schema.arrayOf(schema.string(), { maxSize: 50 })),

  /**
   *  The fields to perform the parsed query against.
   * Valid fields are fields which mapped to 'text' in cspBenchmarkRuleSavedObjectMapping
   */
  // maxSize is set to 2 as there are only 2 valid search fields
  searchFields: schema.arrayOf(
    schema.oneOf([schema.literal('metadata.name.text'), schema.literal('metadata.section.text')]),
    { defaultValue: ['metadata.name.text'], maxSize: 2 }
  ),

  /**
   *  Sort Field
   */
  sortField: schema.oneOf(
    [
      schema.literal('metadata.name'),
      schema.literal('metadata.section'),
      schema.literal('metadata.id'),
      schema.literal('metadata.version'),
      schema.literal('metadata.benchmark.id'),
      schema.literal('metadata.benchmark.name'),
      schema.literal('metadata.benchmark.posture_type'),
      schema.literal('metadata.benchmark.version'),
      schema.literal('metadata.benchmark.rule_number'),
    ],
    {
      defaultValue: 'metadata.benchmark.rule_number',
    }
  ),

  /**
   * The order to sort by
   */
  sortOrder: schema.oneOf([schema.literal('asc'), schema.literal('desc')], {
    defaultValue: 'asc',
  }),

  /**
   * benchmark id
   */
  benchmarkId: schema.maybe(
    schema.oneOf([
      schema.literal('cis_k8s'),
      schema.literal('cis_eks'),
      schema.literal('cis_aws'),
      schema.literal('cis_azure'),
      schema.literal('cis_gcp'),
    ])
  ),
  /**
   * package_policy_id
   */
  packagePolicyId: schema.maybe(schema.string()),

  /**
   * rule section
   */
  section: schema.maybe(schema.string()),
});

export interface FindCspBenchmarkRuleResponse {
  items: CspBenchmarkRule[];
  total: number;
  page: number;
  perPage: number;
}
