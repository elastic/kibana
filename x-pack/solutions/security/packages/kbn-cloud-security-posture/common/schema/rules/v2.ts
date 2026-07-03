/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';

// Since version 8.4.0

// ---------------------------------------------------------------------------
// String length ceilings for rules schemas — DoS protection.
// ---------------------------------------------------------------------------

// Rule/benchmark identifiers (IDs, rego_rule_id, benchmark version, rule number).
// Typical values are UUIDs (36 chars) or short slugs; 256 is generous but safe.
const RULE_ID_MAX_LENGTH = 256;

// Rule name, section name, and other short display labels.
const RULE_NAME_MAX_LENGTH = 1_024;

// Version strings (e.g. "1.4.1", "v1.0.0") — 64 chars is very generous.
const RULE_VERSION_MAX_LENGTH = 64;

// Long free-text fields: description, audit, rationale, remediation, impact,
// default_value, references, profile_applicability — up to 10 KB.
const RULE_TEXT_MAX_LENGTH = 10_240;

// Per-rule tag strings — tags are short labels.
const RULE_TAG_MAX_LENGTH = 256;

export type CspBenchmarkRule = TypeOf<typeof cspBenchmarkRuleSchema>;

export const cspBenchmarkRuleMetadataSchema = schema.object({
  audit: schema.string({ maxLength: RULE_TEXT_MAX_LENGTH }),
  benchmark: schema.object({
    name: schema.string({ maxLength: RULE_NAME_MAX_LENGTH }),
    id: schema.string({ maxLength: RULE_ID_MAX_LENGTH }),
    version: schema.string({ maxLength: RULE_VERSION_MAX_LENGTH }),
  }),
  default_value: schema.maybe(schema.string({ maxLength: RULE_TEXT_MAX_LENGTH })),
  description: schema.string({ maxLength: RULE_TEXT_MAX_LENGTH }),
  id: schema.string({ maxLength: RULE_ID_MAX_LENGTH }),
  impact: schema.maybe(schema.string({ maxLength: RULE_TEXT_MAX_LENGTH })),
  name: schema.string({ maxLength: RULE_NAME_MAX_LENGTH }),
  profile_applicability: schema.string({ maxLength: RULE_TEXT_MAX_LENGTH }),
  rationale: schema.string({ maxLength: RULE_TEXT_MAX_LENGTH }),
  references: schema.maybe(schema.string({ maxLength: RULE_TEXT_MAX_LENGTH })),
  rego_rule_id: schema.string({ maxLength: RULE_ID_MAX_LENGTH }),
  remediation: schema.string({ maxLength: RULE_TEXT_MAX_LENGTH }),
  section: schema.string({ maxLength: RULE_NAME_MAX_LENGTH }),
  // maxSize is set to 100 as it's not expected to have more than 100 tags per rule
  tags: schema.arrayOf(schema.string({ maxLength: RULE_TAG_MAX_LENGTH }), { maxSize: 100 }),
  version: schema.string({ maxLength: RULE_VERSION_MAX_LENGTH }),
});

export const cspBenchmarkRuleSchema = schema.object({
  enabled: schema.boolean(),
  metadata: cspBenchmarkRuleMetadataSchema,
  muted: schema.boolean(),
});
