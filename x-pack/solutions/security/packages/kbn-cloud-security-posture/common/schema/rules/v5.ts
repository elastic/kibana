/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';
import { DEFAULT_BENCHMARK_RULES_PER_PAGE } from './v3';

export type {
  cspBenchmarkRuleMetadataSchema,
  CspBenchmarkRuleMetadata,
  cspBenchmarkRuleSchema,
  CspBenchmarkRule,
  FindCspBenchmarkRuleResponse,
} from './v3';
export type {
  PageUrlParams,
  rulesToUpdate,
  CspBenchmarkRulesBulkActionRequestSchema,
  CspBenchmarkRulesBulkActionResponse,
  RuleStateAttributes,
  CspBenchmarkRulesStates,
  cspSettingsSchema,
  CspSettings,
  BulkActionBenchmarkRulesResponse,
} from './v4';

export type FindCspBenchmarkRuleRequest = TypeOf<typeof findCspBenchmarkRuleRequestSchema>;

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
   * benchmark version
   */
  benchmarkVersion: schema.maybe(schema.string()),

  /**
   * rule section
   */
  // maxSize is set to 100 as there are limited sections per benchmark
  section: schema.maybe(
    schema.oneOf([schema.string(), schema.arrayOf(schema.string(), { minSize: 1, maxSize: 100 })])
  ),
  // maxSize is set to 100 as there are limited rules per benchmark
  ruleNumber: schema.maybe(
    schema.oneOf([schema.string(), schema.arrayOf(schema.string(), { minSize: 1, maxSize: 100 })])
  ),
});

export interface BenchmarkRuleSelectParams {
  section?: string[];
  ruleNumber?: string[];
}
