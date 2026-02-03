/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';

// Since version 8.4.0

export type CspBenchmarkRule = TypeOf<typeof cspBenchmarkRuleSchema>;

export const cspBenchmarkRuleMetadataSchema = schema.object({
  audit: schema.string(),
  benchmark: schema.object({
    name: schema.string(),
    id: schema.string(),
    version: schema.string(),
  }),
  default_value: schema.maybe(schema.string()),
  description: schema.string(),
  id: schema.string(),
  impact: schema.maybe(schema.string()),
  name: schema.string(),
  profile_applicability: schema.string(),
  rationale: schema.string(),
  references: schema.maybe(schema.string()),
  rego_rule_id: schema.string(),
  remediation: schema.string(),
  section: schema.string(),
  // maxSize is set to 100 as it's not expected to have more than 100 tags per rule
  tags: schema.arrayOf(schema.string(), { maxSize: 100 }),
  version: schema.string(),
});

export const cspBenchmarkRuleSchema = schema.object({
  enabled: schema.boolean(),
  metadata: cspBenchmarkRuleMetadataSchema,
  muted: schema.boolean(),
});
