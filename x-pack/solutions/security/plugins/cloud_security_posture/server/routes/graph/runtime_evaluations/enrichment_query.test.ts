/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildIntegrationRuntimeEvals } from './enrichment_query';

/**
 * LIKE type-safety for non-keyword fields (e.g. user.id mapped as long in some integrations)
 * is handled in two places:
 *
 *   1. aws_bedrock.ts: LIKE conditions are written as `TO_STRING(user.id) LIKE "arn:..."` so
 *      the operand is always keyword regardless of how user.id is mapped.
 *
 *   2. fetch_events_graph.ts: `| EVAL user.id = TO_STRING(user.id)` runs before the enrichment
 *      query, ensuring the preserve branch `user.id IS NOT NULL, user.id` in the merged CASE
 *      always returns keyword (fixing the "argument of [CASE] must be [long]" error).
 *
 * These tests verify the enrichment query emits exactly what the source integration files
 * contain — no extra wrapping is added by the merge layer.
 */
describe('buildIntegrationRuntimeEvals — LIKE conditions', () => {
  it('emits TO_STRING(user.id) LIKE as written in aws_bedrock.ts', () => {
    const query = buildIntegrationRuntimeEvals();
    expect(query).toContain('TO_STRING(user.id) LIKE');
  });

  it('does not emit bare user.id LIKE (no wrapping should be absent from source)', () => {
    const query = buildIntegrationRuntimeEvals();
    expect(query).not.toMatch(/\buser\.id\s+LIKE\b/);
  });
});

describe('buildIntegrationRuntimeEvals — CASE default type safety', () => {
  it('uses TO_STRING(null) as the default in every CASE expression to preserve KEYWORD type after constant folding', () => {
    // ES|QL partiallyFold folds CASE to its default when all conditions are constant-false
    // (e.g. after COALESCE makes data_stream.dataset a derived constant and user.id has been
    // pre-cast to KEYWORD so "user.id IS NOT NULL" folds to false). If the default is bare
    // `null` (null_type) but the CASE was typed as KEYWORD, partiallyFold throws
    // "partiallyFold produced type [NULL] but expected [KEYWORD]". Using TO_STRING(null) keeps
    // the default KEYWORD-typed, preventing the mismatch.
    const query = buildIntegrationRuntimeEvals();
    // bare `null` as a top-level CASE default must never appear
    expect(query).not.toMatch(/CASE\([^)]*,\s*\n\s*null\s*\n\s*\)/s);
    // every CASE default must be TO_STRING(null) instead
    expect(query).toMatch(/TO_STRING\(null\)/);
  });
});

describe('buildIntegrationRuntimeEvals — sysdig field names', () => {
  it('uses sysdig.vulnerability.resource_id, not the missing bare resource.id', () => {
    // sysdig.vulnerability data stream has no top-level "resource.id" field.
    // The correct field is "sysdig.vulnerability.resource_id" (keyword).
    // A bare "resource.id" would always be null-typed under SET unmapped_fields=NULLIFY,
    // silently producing null for entity.target.id on every sysdig vulnerability event.
    const query = buildIntegrationRuntimeEvals({ integrations: ['sysdig'] });
    expect(query).toContain('sysdig.vulnerability.resource_id');
    // Bare "resource.id" must not appear as a CASE return value
    expect(query).not.toMatch(/,\s*resource\.id,/);
  });
});
