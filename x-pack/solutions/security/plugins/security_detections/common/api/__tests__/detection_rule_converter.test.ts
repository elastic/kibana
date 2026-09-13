/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Step 8.3 — Detection rule converter tests.
 *
 * Covers:
 *   - Round-trip for the Custom Query type: public → framework → public is the
 *     identity on every field the contract owns.
 *   - Round-trip for the Threshold type: same.
 *   - Off-table rule 1 — empty tags:
 *       - create: converter omits metadata.tags
 *       - update (PATCH): converter sends metadata.tags: null
 *       - response: converter returns tags: []
 *   - Off-table rule 2 — description cap: inherited from the framework (1024)
 *   - Off-table rule 3 — internal fields never surface in the response
 *
 * Ref: rule-domain-model.md "How public fields map onto the stored rule"
 *      rule-domain-model.md "Two models, one converter"
 */

import type { RuleResponse, RuleSource } from '@kbn/alerting-v2-schemas';
import { updateRuleDataSchema } from '@kbn/alerting-v2-schemas';
import {
  toFrameworkCreate,
  toFrameworkReplace,
  toFrameworkPatch,
  toPublicResponse,
} from '../detection_rule_converter';
import type {
  DetectionRuleCreateInput,
  DetectionRulePatchedInput,
} from '../detection_rule_converter';

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

/**
 * A minimal valid Create Query rule payload (with defaults already applied).
 * Every field the converter maps must be present here.
 */
const QUERY_CREATE_INPUT: DetectionRuleCreateInput = {
  type: 'query',
  name: 'Suspicious process from temp directory',
  description: 'Detects process starts from temp paths',
  version: 1,
  rule_id: 'b1c2d3e4-f5a6-4b7c-8d9e-0f1a2b3c4d5e',
  tags: ['os:windows'],
  severity: 'high',
  risk_score: 73,
  max_signals: 100,
  threat: [
    {
      framework: 'MITRE ATT&CK',
      tactic: {
        id: 'TA0002',
        name: 'Execution',
        reference: 'https://attack.mitre.org/tactics/TA0002/',
      },
    },
  ],
  setup: '',
  note: 'Investigation guidance here',
  references: ['https://example.org/writeup'],
  false_positives: [],
  author: [],
  license: undefined,
  related_integrations: [],
  required_fields: [],
  schedule: { interval: '5m' },
  language: 'kuery',
  index: ['logs-*', 'winlogbeat-*'],
  query: 'process.args:/tmp/* and event.type:start',
};

/**
 * A minimal valid Create Threshold rule payload (with defaults already applied).
 */
const THRESHOLD_CREATE_INPUT: DetectionRuleCreateInput = {
  type: 'threshold',
  name: 'High login count from single IP',
  description: 'Detects brute force attacks',
  version: 1,
  rule_id: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
  tags: ['attack:brute-force'],
  severity: 'medium',
  risk_score: 50,
  max_signals: 100,
  threat: [],
  setup: '',
  references: [],
  false_positives: [],
  author: ['Security Team'],
  related_integrations: [],
  required_fields: [],
  schedule: { interval: '10m', lookback: '15m' },
  language: 'kuery',
  index: ['logs-endpoint*'],
  query: 'event.category:authentication',
  threshold: {
    field: ['source.ip'],
    value: 100,
    cardinality: [{ field: 'user.name', value: 5 }],
  },
};

/**
 * Builds a minimal framework RuleResponse from a DetectionRuleCreateInput.
 * This simulates what the framework returns after creating the rule.
 *
 * Only the fields the converter reads are required here; all others use
 * sentinel values (e.g. kind: 'signal', no query for execution-time rules).
 */
function buildFrameworkResponse(
  input: DetectionRuleCreateInput,
  overrides: Partial<RuleResponse> = {}
): RuleResponse {
  const builderTypeId =
    input.type === 'threshold' ? 'security.detection.threshold' : 'security.detection.query';

  const builderFields: Record<string, unknown> = {
    severity: input.severity,
    risk_score: input.risk_score,
    index: input.index,
    query: input.query,
    language: input.language,
  };
  if (input.max_signals !== undefined) builderFields.max_signals = input.max_signals;
  if (input.threat != null) builderFields.threat = input.threat;
  if (input.setup != null) builderFields.setup = input.setup;
  if (input.note != null) builderFields.note = input.note;
  if (input.references != null) builderFields.references = input.references;
  if (input.false_positives != null) builderFields.false_positives = input.false_positives;
  if (input.author != null) builderFields.author = input.author;
  if (input.license != null) builderFields.license = input.license;
  if (input.related_integrations != null)
    builderFields.related_integrations = input.related_integrations;
  if (input.required_fields != null) builderFields.required_fields = input.required_fields;
  if (input.threshold !== undefined) builderFields.threshold = input.threshold;

  const metadataTags = (input.tags ?? []).length > 0 ? input.tags : undefined;

  return {
    id: '0d3f4c1a-7b2e-4b8f-9c6d-1e5a8f0b2c3d',
    kind: 'signal',
    time_field: '@timestamp',
    schedule: {
      every: input.schedule.interval,
      ...(input.schedule.lookback !== undefined ? { lookback: input.schedule.lookback } : {}),
    },
    enabled: false,
    created_by: 'elastic_profile_uid',
    created_at: '2026-09-11T09:14:02.331Z',
    updated_by: 'elastic_profile_uid',
    updated_at: '2026-09-11T09:14:02.331Z',
    metadata: {
      name: input.name,
      description: input.description,
      signature_id: input.rule_id ?? 'generated-uuid-v4',
      source: { type: 'internal', version: input.version },
      ownership: { managed: true, solution: 'security', domain: 'detection' },
      version: 1, // mutation sequence — not exposed publicly
      revision: 0,
      builder_type: builderTypeId,
      builder_fields: builderFields,
      ...(metadataTags !== undefined ? { tags: metadataTags } : {}),
    },
    ...overrides,
  } as RuleResponse;
}

// ---------------------------------------------------------------------------
// Round-trip: Custom Query type
// ---------------------------------------------------------------------------

describe('toFrameworkCreate + toPublicResponse — Custom Query round-trip', () => {
  const input = QUERY_CREATE_INPUT;
  const frameworkData = toFrameworkCreate(input);
  const frameworkResponse = buildFrameworkResponse(input);
  const publicResponse = toPublicResponse(frameworkResponse);

  it('maps type via the alias: "query" ↔ "security.detection.query"', () => {
    expect(frameworkData.metadata.builder_type).toBe('security.detection.query');
    expect(publicResponse.type).toBe('query');
  });

  it('maps rule_id ↔ metadata.signature_id', () => {
    expect(frameworkData.metadata.signature_id).toBe(input.rule_id);
    expect(publicResponse.rule_id).toBe(input.rule_id);
  });

  it('maps version → metadata.source.version and back', () => {
    const source = frameworkData.metadata.source as RuleSource;
    expect(source.version).toBe(input.version);
    expect(publicResponse.version).toBe(input.version);
  });

  it('maps name ↔ metadata.name', () => {
    expect(frameworkData.metadata.name).toBe(input.name);
    expect(publicResponse.name).toBe(input.name);
  });

  it('maps description ↔ metadata.description', () => {
    expect(frameworkData.metadata.description).toBe(input.description);
    expect(publicResponse.description).toBe(input.description);
  });

  it('maps tags ↔ metadata.tags', () => {
    expect(frameworkData.metadata.tags).toEqual(input.tags);
    expect(publicResponse.tags).toEqual(input.tags);
  });

  it('maps schedule.interval ↔ schedule.every', () => {
    expect(frameworkData.schedule.every).toBe(input.schedule.interval);
    expect(publicResponse.schedule.interval).toBe(input.schedule.interval);
  });

  it('omits schedule.lookback when not set', () => {
    expect(frameworkData.schedule.lookback).toBeUndefined();
    expect(publicResponse.schedule.lookback).toBeUndefined();
  });

  it('maps all detection fields into metadata.builder_fields and back', () => {
    const bf = frameworkData.metadata.builder_fields as Record<string, unknown>;
    expect(bf.severity).toBe(input.severity);
    expect(bf.risk_score).toBe(input.risk_score);
    expect(bf.max_signals).toBe(input.max_signals);
    expect(bf.index).toEqual(input.index);
    expect(bf.query).toBe(input.query);
    expect(bf.language).toBe(input.language);
    expect(bf.threat).toEqual(input.threat);
    expect(bf.setup).toBe(input.setup);
    expect(bf.note).toBe(input.note);
    expect(bf.references).toEqual(input.references);
    expect(bf.false_positives).toEqual(input.false_positives);
    expect(bf.author).toEqual(input.author);
    expect(bf.related_integrations).toEqual(input.related_integrations);
    expect(bf.required_fields).toEqual(input.required_fields);

    // Response direction
    expect(publicResponse.severity).toBe(input.severity);
    expect(publicResponse.risk_score).toBe(input.risk_score);
    expect(publicResponse.max_signals).toBe(input.max_signals);
    expect((publicResponse as { index: string[] }).index).toEqual(input.index);
    expect((publicResponse as { query: string }).query).toBe(input.query);
    expect((publicResponse as { language: string }).language).toBe(input.language);
  });

  it('does not persist a query (execution-time compilation)', () => {
    // Detection rules persist no query — the framework generates it at run time.
    expect((frameworkData as { query?: unknown }).query).toBeUndefined();
  });

  it('pins kind: "signal"', () => {
    expect(frameworkData.kind).toBe('signal');
  });

  it('sets source to internal with version 1', () => {
    const source = frameworkData.metadata.source as RuleSource;
    expect(source).toEqual({ type: 'internal', version: 1 });
  });
});

// ---------------------------------------------------------------------------
// Round-trip: Threshold type
// ---------------------------------------------------------------------------

describe('toFrameworkCreate + toPublicResponse — Threshold round-trip', () => {
  const input = THRESHOLD_CREATE_INPUT;
  const frameworkData = toFrameworkCreate(input);
  const frameworkResponse = buildFrameworkResponse(input);
  const publicResponse = toPublicResponse(frameworkResponse);

  it('maps type via the alias: "threshold" ↔ "security.detection.threshold"', () => {
    expect(frameworkData.metadata.builder_type).toBe('security.detection.threshold');
    expect(publicResponse.type).toBe('threshold');
  });

  it('maps the threshold object into builder_fields and back', () => {
    const bf = frameworkData.metadata.builder_fields as Record<string, unknown>;
    expect(bf.threshold).toEqual(input.threshold);
    expect((publicResponse as { threshold: unknown }).threshold).toEqual(input.threshold);
  });

  it('maps schedule.lookback when set', () => {
    expect(frameworkData.schedule.lookback).toBe('15m');
    expect(publicResponse.schedule.lookback).toBe('15m');
  });

  it('maps tags', () => {
    expect(frameworkData.metadata.tags).toEqual(['attack:brute-force']);
    expect(publicResponse.tags).toEqual(['attack:brute-force']);
  });

  it('stores no query (execution-time type)', () => {
    expect((frameworkData as { query?: unknown }).query).toBeUndefined();
  });

  it('all shared detection fields survive the round-trip', () => {
    expect(publicResponse.severity).toBe(input.severity);
    expect(publicResponse.risk_score).toBe(input.risk_score);
    expect(publicResponse.max_signals).toBe(input.max_signals);
    expect(publicResponse.author).toEqual(['Security Team']);
    expect(publicResponse.rule_id).toBe(input.rule_id);
    expect(publicResponse.version).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Off-table rule 1: empty tags
// ---------------------------------------------------------------------------

describe('Empty tags — off-table rule', () => {
  const emptyTagsInput: DetectionRuleCreateInput = {
    ...QUERY_CREATE_INPUT,
    tags: [],
  };

  it('on create: omits metadata.tags when tags is []', () => {
    const frameworkData = toFrameworkCreate(emptyTagsInput);
    // The framework rejects an empty array; the converter must omit the field.
    expect(frameworkData.metadata.tags).toBeUndefined();
  });

  it('on replace (PUT): sends metadata.tags: null when tags is [] (clears stored tags)', () => {
    const storedSource: RuleSource = { type: 'internal', version: 1 };
    const frameworkData = toFrameworkReplace(emptyTagsInput, storedSource);
    // PUT must send null (not undefined) so the framework clears any stored tags
    // rather than keeping them unchanged.
    expect(frameworkData.metadata!.tags).toBeNull();
  });

  it('on patch (PATCH): sends metadata.tags: null when merged tags is []', () => {
    const mergedInput: DetectionRulePatchedInput = {
      name: QUERY_CREATE_INPUT.name,
      description: QUERY_CREATE_INPUT.description,
      version: 1,
      tags: [], // cleared by the patch
      severity: QUERY_CREATE_INPUT.severity,
      risk_score: QUERY_CREATE_INPUT.risk_score,
      max_signals: 100,
      threat: [],
      setup: '',
      references: [],
      false_positives: [],
      author: [],
      related_integrations: [],
      required_fields: [],
      schedule: { interval: '5m' },
      language: 'kuery',
      index: QUERY_CREATE_INPUT.index,
      query: QUERY_CREATE_INPUT.query,
      source: { type: 'internal', version: 1 },
    };
    const updateData = toFrameworkPatch(mergedInput);
    // On a partial update, null explicitly clears the stored value.
    expect(updateData.metadata?.tags).toBeNull();
  });

  it('on response: reads absent metadata.tags back as []', () => {
    // The framework stores no tags (omitted when empty).
    const frameworkResponse = buildFrameworkResponse(emptyTagsInput);
    // The fixture helper already omits tags when the input has tags: [].
    expect(frameworkResponse.metadata.tags).toBeUndefined();

    const publicResponse = toPublicResponse(frameworkResponse);
    // The public contract always hands the caller an array.
    expect(publicResponse.tags).toEqual([]);
  });

  it('non-empty tags survive the round-trip unchanged', () => {
    const input = { ...QUERY_CREATE_INPUT, tags: ['os:linux', 'attack:execution'] };
    const frameworkData = toFrameworkCreate(input);
    expect(frameworkData.metadata.tags).toEqual(['os:linux', 'attack:execution']);

    const frameworkResponse = buildFrameworkResponse(input);
    const publicResponse = toPublicResponse(frameworkResponse);
    expect(publicResponse.tags).toEqual(['os:linux', 'attack:execution']);
  });
});

// ---------------------------------------------------------------------------
// Off-table rule 2: description cap
// ---------------------------------------------------------------------------

describe('Description cap — off-table rule', () => {
  it('accepts a description exactly at the 1024-char cap', () => {
    const longDescription = 'x'.repeat(1024);
    const input: DetectionRuleCreateInput = {
      ...QUERY_CREATE_INPUT,
      description: longDescription,
    };
    const frameworkData = toFrameworkCreate(input);
    // The converter does not truncate.
    expect(frameworkData.metadata.description).toBe(longDescription);
    expect(frameworkData.metadata.description!.length).toBe(1024);
  });

  it('does not widen the cap — passes the description verbatim', () => {
    // The converter is not responsible for enforcement (the schema validates);
    // it must not silently truncate or modify the value.
    const description = 'Detects suspicious activity';
    const input: DetectionRuleCreateInput = { ...QUERY_CREATE_INPUT, description };
    const frameworkData = toFrameworkCreate(input);
    expect(frameworkData.metadata.description).toBe(description);
  });

  it('response direction: reads absent metadata.description back as empty string', () => {
    // The framework allows description to be absent; the public contract requires it.
    const frameworkResponse: RuleResponse = {
      ...buildFrameworkResponse(QUERY_CREATE_INPUT),
      metadata: {
        ...buildFrameworkResponse(QUERY_CREATE_INPUT).metadata,
        description: undefined,
      },
    };
    const publicResponse = toPublicResponse(frameworkResponse);
    // Public contract: description is always present (defaults to '').
    expect(publicResponse.description).toBe('');
  });
});

// ---------------------------------------------------------------------------
// Off-table rule 3: internal fields never surface in the response
// ---------------------------------------------------------------------------

describe('Internal fields — off-table rule', () => {
  const frameworkResponse = buildFrameworkResponse(QUERY_CREATE_INPUT);
  const publicResponse = toPublicResponse(frameworkResponse) as Record<string, unknown>;

  it('kind is not in the public response', () => {
    expect('kind' in publicResponse).toBe(false);
  });

  it('time_field is not in the public response', () => {
    expect('time_field' in publicResponse).toBe(false);
  });

  it('grouping is not in the public response', () => {
    expect('grouping' in publicResponse).toBe(false);
  });

  it('recovery_strategy is not in the public response', () => {
    expect('recovery_strategy' in publicResponse).toBe(false);
  });

  it('no_data_strategy is not in the public response', () => {
    expect('no_data_strategy' in publicResponse).toBe(false);
  });

  it('state_transition is not in the public response', () => {
    expect('state_transition' in publicResponse).toBe(false);
  });

  it('artifacts is not in the public response', () => {
    expect('artifacts' in publicResponse).toBe(false);
  });

  it('metadata (the framework container) is not in the public response', () => {
    // The public contract exposes individual fields, never the container.
    expect('metadata' in publicResponse).toBe(false);
  });

  it('metadata.version (the mutation sequence) is not surfaced', () => {
    // The framework's metadata.version is an internal mutation counter; the
    // public `version` is the content version from metadata.source.version.
    expect('metadata' in publicResponse).toBe(false);
    // The public version is the source version (1), not the mutation counter.
    expect(publicResponse.version).toBe(1);
  });

  it('the saved-object concurrency token is not surfaced', () => {
    // The SO token is the string field `rule.version` in the framework response;
    // the Detections API does not expose it.  The public `version` field is
    // the content version from `metadata.source.version` — a number, not a token.
    //
    // The two share the same key name ("version") but are distinct concepts.
    // The converter maps `metadata.source.version` (a number) to the public
    // `version` and must not pass through the string SO token.
    expect(typeof publicResponse.version).toBe('number');
    expect(publicResponse.version).toBe(1); // content version from metadata.source.version
  });

  it('ownership is not in the public response', () => {
    expect('ownership' in publicResponse).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// toFrameworkReplace: stored source restated with new version
// ---------------------------------------------------------------------------

describe('toFrameworkReplace — source version update', () => {
  it('restates an internal source with the caller-supplied version', () => {
    const storedSource: RuleSource = { type: 'internal', version: 1 };
    const input: DetectionRuleCreateInput = { ...QUERY_CREATE_INPUT, version: 3 };
    const frameworkData = toFrameworkReplace(input, storedSource);
    expect((frameworkData.metadata!.source as RuleSource).version).toBe(3);
    expect((frameworkData.metadata!.source as RuleSource).type).toBe('internal');
  });

  it('preserves source.type and source.id from the stored source', () => {
    const storedSource: RuleSource = { type: 'template', version: 2, id: 'tpl-xyz' };
    const input: DetectionRuleCreateInput = { ...QUERY_CREATE_INPUT, version: 3 };
    const frameworkData = toFrameworkReplace(input, storedSource);
    const source = frameworkData.metadata!.source as RuleSource;
    expect(source.type).toBe('template');
    expect((source as { id?: string }).id).toBe('tpl-xyz');
    expect(source.version).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// toFrameworkPatch: schedule.lookback handling
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// toFrameworkPatch: concurrency token must NOT be in the update data body
// ---------------------------------------------------------------------------

describe('toFrameworkPatch — no top-level version key in update data', () => {
  const BASE_PATCH_FOR_OCC: import('../detection_rule_converter').DetectionRulePatchedInput = {
    name: 'Test rule',
    description: 'Test description',
    version: 1,
    tags: [],
    severity: 'low',
    risk_score: 10,
    max_signals: 100,
    threat: [],
    setup: '',
    references: [],
    false_positives: [],
    author: [],
    related_integrations: [],
    required_fields: [],
    language: 'kuery',
    index: ['logs-*'],
    query: 'event.type:start',
    source: { type: 'internal', version: 1 },
    schedule: { interval: '5m' },
  };

  it('the returned data has no top-level version key', () => {
    // The concurrency token belongs in options.version, not in the update body.
    // updateRuleDataSchema is strict — a top-level `version` key would cause a 400.
    const data = toFrameworkPatch(BASE_PATCH_FOR_OCC);
    expect('version' in data).toBe(false);
  });

  it('the returned data parses cleanly against the real updateRuleDataSchema', () => {
    const data = toFrameworkPatch(BASE_PATCH_FOR_OCC);
    const result = updateRuleDataSchema.safeParse(data);
    expect(result.success).toBe(true);
  });
});

describe('toFrameworkPatch — schedule.lookback handling', () => {
  const BASE_PATCH: DetectionRulePatchedInput = {
    name: 'Test rule',
    description: 'Test description',
    version: 1,
    tags: ['test'],
    severity: 'low',
    risk_score: 10,
    max_signals: 100,
    threat: [],
    setup: '',
    references: [],
    false_positives: [],
    author: [],
    related_integrations: [],
    required_fields: [],
    language: 'kuery',
    index: ['logs-*'],
    query: 'event.type:start',
    source: { type: 'internal', version: 1 },
    schedule: { interval: '5m' },
  };

  it('omits lookback when undefined (keep stored value)', () => {
    const updateData = toFrameworkPatch({ ...BASE_PATCH, schedule: { interval: '5m' } });
    expect(updateData.schedule?.lookback).toBeUndefined();
  });

  it('sends lookback: null to clear the stored value', () => {
    const updateData = toFrameworkPatch({
      ...BASE_PATCH,
      schedule: { interval: '5m', lookback: null },
    });
    expect(updateData.schedule?.lookback).toBeNull();
  });

  it('sends lookback: string when set', () => {
    const updateData = toFrameworkPatch({
      ...BASE_PATCH,
      schedule: { interval: '5m', lookback: '10m' },
    });
    expect(updateData.schedule?.lookback).toBe('10m');
  });
});

// ---------------------------------------------------------------------------
// toPublicResponse: source field mapping
// ---------------------------------------------------------------------------

describe('toPublicResponse — source field mapping', () => {
  it('maps internal source (no id) to { type: "internal" }', () => {
    const response = buildFrameworkResponse(QUERY_CREATE_INPUT);
    const publicResponse = toPublicResponse(response);
    expect(publicResponse.source).toEqual({ type: 'internal' });
  });

  it('maps template source (with id) to { type: "template", id }', () => {
    const response: RuleResponse = {
      ...buildFrameworkResponse(QUERY_CREATE_INPUT),
      metadata: {
        ...buildFrameworkResponse(QUERY_CREATE_INPUT).metadata,
        source: { type: 'template', version: 1, id: 'tpl-abc' },
      },
    };
    const publicResponse = toPublicResponse(response);
    expect(publicResponse.source).toEqual({ type: 'template', id: 'tpl-abc' });
    // version is a top-level public field, not inside source
    expect(publicResponse.version).toBe(1);
  });

  it('exposes source.version as the top-level version field, not inside source', () => {
    const response = buildFrameworkResponse({ ...QUERY_CREATE_INPUT, version: 7 });
    const publicResponse = toPublicResponse(response);
    expect(publicResponse.version).toBe(7);
    // source should not expose version
    expect((publicResponse.source as Record<string, unknown>).version).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// toPublicResponse: unknown builder type throws
// ---------------------------------------------------------------------------

describe('toPublicResponse — unknown builder type', () => {
  it('throws for an unknown or absent builder_type', () => {
    const response: RuleResponse = {
      ...buildFrameworkResponse(QUERY_CREATE_INPUT),
      metadata: {
        ...buildFrameworkResponse(QUERY_CREATE_INPUT).metadata,
        builder_type: 'security.detection.eql', // not in the alias map
      },
    };
    expect(() => toPublicResponse(response)).toThrow(/unknown or missing builder type/i);
  });
});

// ---------------------------------------------------------------------------
// toFrameworkCreate: does not set internal fields
// ---------------------------------------------------------------------------

describe('toFrameworkCreate — uniform detection-rule fields', () => {
  const frameworkData = toFrameworkCreate(QUERY_CREATE_INPUT) as Record<string, unknown>;

  it('sets recovery_strategy to "none" for uniform stored rules', () => {
    // Sent explicitly so stored detection rules are uniform even if the
    // framework default changes.  rule-crud-api.md "Create a rule".
    expect(frameworkData.recovery_strategy).toBe('none');
  });

  it('sets no_data_strategy to "none" for uniform stored rules', () => {
    expect(frameworkData.no_data_strategy).toBe('none');
  });

  it('does not set state_transition', () => {
    expect('state_transition' in frameworkData).toBe(false);
  });

  it('does not set grouping', () => {
    expect('grouping' in frameworkData).toBe(false);
  });

  it('does not set artifacts', () => {
    expect('artifacts' in frameworkData).toBe(false);
  });

  it('does not set a query (execution-time compilation)', () => {
    expect('query' in frameworkData).toBe(false);
  });
});
