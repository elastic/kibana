/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Step B.9 — structural coverage for the moved builder type definitions.
 *
 * Rebuilds the coverage that B.6 removed from the framework:
 *   - Both real definitions carry the ownership, kind, and compilation the
 *     framework's checks require.
 *   - Neither declares a manifest.
 *   - Both field schemas parse a maximal document of their type.
 *
 * The query-generation and validate-fields tests are in the sibling files
 * custom_query.test.ts and threshold_definition.test.ts.
 *
 * Ref: implementation-plan.md "Step B.9: the definitions and functions move
 *      into the plugin"
 *      builder-type-registration-redesign.md "The registration contract"
 */

import { z } from '@kbn/zod/v4';
import { detectionRuleBuilderFieldsManifest } from '@kbn/security-detection-rule-builder-fields';
import { assertValidDefinition, FoldedVersionsSet } from '@kbn/alerting-v2-plugin/server';
import type {
  BuilderFieldsManifest,
  MappingProperty,
  RegisteredBuilderType,
} from '@kbn/alerting-v2-rule-builders';
import { securityDetectionQuery } from '../custom_query';
import { securityDetectionThreshold } from '../threshold_definition';
import type { CustomQueryBuilderFields } from '../../../common/detection_rule_fields/custom_query';
import type { ThresholdBuilderFields } from '../../../common/detection_rule_fields/threshold_builder_fields';

// ---------------------------------------------------------------------------
// Maximal documents
//
// Every bounded field is set to its maximum allowed value.  A parse error here
// means a schema bound drifted from what the definition exposes to the
// framework, which the total-mapping registration check would also catch at
// plugin boot.
//
// note and setup use the raised bounds from step B.8:
//   note: 65,536 characters
//   setup: 16,384 characters
// ---------------------------------------------------------------------------

const MAX_COMMON_FIELDS = {
  severity: 'critical' as const,
  risk_score: 100,
  max_signals: 10000,
  threat: Array(5).fill({
    framework: 'x'.repeat(64),
    tactic: {
      id: 'x'.repeat(32),
      name: 'x'.repeat(256),
      reference: 'x'.repeat(512),
    },
    technique: Array(5).fill({
      id: 'x'.repeat(32),
      name: 'x'.repeat(256),
      reference: 'x'.repeat(512),
      subtechnique: Array(3).fill({
        id: 'x'.repeat(32),
        name: 'x'.repeat(256),
        reference: 'x'.repeat(512),
      }),
    }),
  }),
  setup: 'x'.repeat(16384),
  note: 'x'.repeat(65536),
  references: Array(32).fill('x'.repeat(1024)),
  false_positives: Array(16).fill('x'.repeat(1024)),
  author: Array(16).fill('x'.repeat(256)),
  license: 'x'.repeat(256),
  related_integrations: Array(16).fill({
    package: 'x'.repeat(64),
    version: 'x'.repeat(32),
    integration: 'x'.repeat(64),
  }),
  required_fields: Array(32).fill({
    name: 'x'.repeat(128),
    type: 'x'.repeat(64),
    ecs: true,
  }),
};

const MAX_CUSTOM_QUERY_FIELDS: CustomQueryBuilderFields = {
  ...MAX_COMMON_FIELDS,
  index: Array(32).fill('x'.repeat(256)),
  query: 'x'.repeat(8192),
  language: 'lucene',
};

const MAX_THRESHOLD_FIELDS: ThresholdBuilderFields = {
  ...MAX_COMMON_FIELDS,
  index: Array(32).fill('x'.repeat(256)),
  query: 'x'.repeat(8192),
  language: 'lucene',
  threshold: {
    field: Array(5).fill('x'.repeat(256)),
    value: 1,
    cardinality: [{ field: 'x'.repeat(256), value: 0 }],
  },
};

// ---------------------------------------------------------------------------
// Both definitions carry the required framework contract properties
// ---------------------------------------------------------------------------

describe('securityDetectionQuery — framework contract', () => {
  it('has type security.detection.query', () => {
    expect(securityDetectionQuery.type).toBe('security.detection.query');
  });

  it('pins kind to alert', () => {
    expect(securityDetectionQuery.kind).toBe('alert');
  });

  it('declares execution_time compilation', () => {
    expect(securityDetectionQuery.compilation).toBe('execution_time');
  });

  it('declares security/detection ownership', () => {
    expect(securityDetectionQuery.ownership).toEqual({
      solution: 'security',
      domain: 'detection',
    });
  });

  it('does not declare a manifest (storage travels on a separate path)', () => {
    // A registration carries no manifest per the redesign.
    // @ts-expect-error – manifest is no longer on BuilderTypeDefinition; this
    // assertion documents the deliberate absence.
    expect((securityDetectionQuery as Record<string, unknown>).manifest).toBeUndefined();
  });

  it('does not carry deriveRuleFields', () => {
    expect(securityDetectionQuery.deriveRuleFields).toBeUndefined();
  });

  it('carries a validateFields hook', () => {
    expect(typeof securityDetectionQuery.validateFields).toBe('function');
  });

  it('carries an enrichRuleEvent hook', () => {
    expect(typeof securityDetectionQuery.enrichRuleEvent).toBe('function');
  });
});

describe('securityDetectionThreshold — framework contract', () => {
  it('has type security.detection.threshold', () => {
    expect(securityDetectionThreshold.type).toBe('security.detection.threshold');
  });

  it('pins kind to alert', () => {
    expect(securityDetectionThreshold.kind).toBe('alert');
  });

  it('declares execution_time compilation', () => {
    expect(securityDetectionThreshold.compilation).toBe('execution_time');
  });

  it('declares security/detection ownership', () => {
    expect(securityDetectionThreshold.ownership).toEqual({
      solution: 'security',
      domain: 'detection',
    });
  });

  it('does not declare a manifest (storage travels on a separate path)', () => {
    // A registration carries no manifest per the redesign.
    // @ts-expect-error – manifest is no longer on BuilderTypeDefinition; this
    // assertion documents the deliberate absence.
    expect((securityDetectionThreshold as Record<string, unknown>).manifest).toBeUndefined();
  });

  it('does not carry deriveRuleFields (removed in ad-hoc phase A)', () => {
    expect(securityDetectionThreshold.deriveRuleFields).toBeUndefined();
  });

  it('carries a validateFields hook', () => {
    expect(typeof securityDetectionThreshold.validateFields).toBe('function');
  });

  it('carries an enrichRuleEvent hook', () => {
    expect(typeof securityDetectionThreshold.enrichRuleEvent).toBe('function');
  });
});

// ---------------------------------------------------------------------------
// Both field schemas parse a maximal document
// ---------------------------------------------------------------------------

describe('customQueryBuilderFieldsSchema — maximal document', () => {
  it('parses a document where every field is at its maximum value', () => {
    const result = securityDetectionQuery.builderFieldsSchema.safeParse(MAX_CUSTOM_QUERY_FIELDS);
    expect(result.success).toBe(true);
  });
});

describe('thresholdBuilderFieldsSchema — maximal document', () => {
  it('parses a document where every field is at its maximum value', () => {
    const result = securityDetectionThreshold.builderFieldsSchema.safeParse(MAX_THRESHOLD_FIELDS);
    expect(result.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Total-mapping proof against the shipped manifest (step B.7 acceptance criterion)
//
// Step B.7 requires "a case proving both real detection schemas pass total
// mapping against the shipped manifest." This proof calls the framework's real
// assertValidDefinition (now exported from @kbn/alerting-v2-plugin/server),
// which is the same check plugin boot runs. A FoldedVersionsSet fixture backed
// by the real manifest stands in for the production globalFoldedVersions.
//
// Ref: implementation-plan.md step B.7 acceptance criterion
//      builder-type-registration-redesign.md "Registration-time checks" row 6
// ---------------------------------------------------------------------------

/**
 * A FoldedVersionsRecord backed by the real detection manifest.
 *
 * The production singleton (globalFoldedVersions) is populated by
 * fromBuilderFieldsManifest() calls at plugin boot. Tests cannot reach that
 * singleton, so this fixture replicates the same effect by recording the
 * manifest at its currentVersion. The set covers both builder types the
 * manifest declares (security.detection.query and security.detection.threshold),
 * so assertValidDefinition's total-mapping and managed-type checks both run.
 */
function makeFoldedSet(): FoldedVersionsSet {
  const set = new FoldedVersionsSet();
  set.recordManifest(
    detectionRuleBuilderFieldsManifest,
    detectionRuleBuilderFieldsManifest.currentVersion
  );
  return set;
}

describe('total-mapping proof — both real schemas against the shipped manifest', () => {
  it('securityDetectionQuery passes the real assertValidDefinition', () => {
    // Cast from BuilderTypeDefinition<ConcreteFields> to RegisteredBuilderType
    // (OpaqueBuilderFields) exactly as defineBuilderType() does at the call site.
    const def = securityDetectionQuery as unknown as RegisteredBuilderType;
    expect(() => assertValidDefinition(def, makeFoldedSet())).not.toThrow();
  });

  it('securityDetectionThreshold passes the real assertValidDefinition', () => {
    const def = securityDetectionThreshold as unknown as RegisteredBuilderType;
    expect(() => assertValidDefinition(def, makeFoldedSet())).not.toThrow();
  });

  it('customQueryBuilderFieldsSchema produces 28 unique leaf paths (32 minus the 4 threshold-only leaves)', () => {
    const json = z.toJSONSchema(securityDetectionQuery.builderFieldsSchema, {
      io: 'input',
    }) as Record<string, unknown>;
    const paths = collectLeafPaths(json, '');
    // 32 total manifest leaves minus 4 threshold-specific ones
    // (threshold.field, threshold.value, threshold.cardinality.field, threshold.cardinality.value).
    expect(paths.size).toBe(28);
  });

  it('thresholdBuilderFieldsSchema produces 32 unique leaf paths (the full manifest)', () => {
    const json = z.toJSONSchema(securityDetectionThreshold.builderFieldsSchema, {
      io: 'input',
    }) as Record<string, unknown>;
    const paths = collectLeafPaths(json, '');
    expect(paths.size).toBe(32);
  });
});

// ---------------------------------------------------------------------------
// Negative cases — the checker catches manifest drift
//
// Each case deep-copies currentMappings, applies one mutation, builds a fresh
// FoldedVersionsSet from the mutated manifest, and asserts that
// assertValidDefinition throws for the specific reason the mutation introduces.
// A fresh deep-copy per case ensures no mutation leaks into later tests.
//
// The two leaves chosen — threat.technique.subtechnique.reference and
// required_fields.ecs — are deep nested or boolean leaves that the old subset
// fixtures in alerting_v2/saved_objects/model_versions never reach.
// ---------------------------------------------------------------------------

/**
 * Returns a FoldedVersionsSet backed by a mutated copy of the real detection
 * manifest. `mutate` receives a fresh deep-copy of currentMappings and may
 * delete, replace, or add any entry. The exported manifest is never touched.
 */
function makeMutatedFoldedSet(
  mutate: (mappings: Record<string, MappingProperty>) => void
): FoldedVersionsSet {
  // JSON round-trip deep-copies the MappingProperty values, which are plain
  // serialisable objects (type string plus optional numeric fields only).
  const clonedMappings = JSON.parse(
    JSON.stringify(detectionRuleBuilderFieldsManifest.currentMappings)
  ) as Record<string, MappingProperty>;
  mutate(clonedMappings);
  const manifest: BuilderFieldsManifest = {
    ...detectionRuleBuilderFieldsManifest,
    currentMappings: clonedMappings,
  };
  const set = new FoldedVersionsSet();
  set.recordManifest(manifest, manifest.currentVersion);
  return set;
}

describe('total-mapping negative cases — the checker catches manifest drift', () => {
  // securityDetectionQuery is used for every case.  The fields under test
  // (threat.technique.subtechnique.reference, required_fields.ecs) are shared
  // common fields declared in detectionRuleCommonFields, so either definition
  // would work; the query definition keeps the cases concise.
  const def = () => securityDetectionQuery as unknown as RegisteredBuilderType;

  it('rejects a manifest missing threat.technique.subtechnique.reference', () => {
    // Removing a leaf the schema produces triggers the "no sub-field declared"
    // branch of assertLeafMapping. This leaf is a deep path that the old subset
    // fixtures in alerting_v2 never reach.
    const foldedSet = makeMutatedFoldedSet((m) => {
      delete m['threat.technique.subtechnique.reference'];
    });
    expect(() => assertValidDefinition(def(), foldedSet)).toThrow(
      /no sub-field is declared for it in the manifest/
    );
  });

  it('rejects a manifest missing required_fields.ecs', () => {
    // required_fields.ecs is the only boolean leaf in the manifest; removing it
    // surfaces the same "no sub-field declared" error on a different type.
    const foldedSet = makeMutatedFoldedSet((m) => {
      delete m['required_fields.ecs'];
    });
    expect(() => assertValidDefinition(def(), foldedSet)).toThrow(
      /no sub-field is declared for it in the manifest/
    );
  });

  it('rejects a manifest where required_fields.ecs is keyword instead of boolean', () => {
    // The schema declares required_fields.ecs as z.boolean(); the only
    // compatible sub-field type is 'boolean'. A keyword sub-field triggers the
    // type-compatibility branch: "schema type boolean is not compatible with
    // sub-field type keyword".
    const foldedSet = makeMutatedFoldedSet((m) => {
      m['required_fields.ecs'] = { type: 'keyword', ignore_above: 128 };
    });
    expect(() => assertValidDefinition(def(), foldedSet)).toThrow(
      /is not compatible with sub-field type/
    );
  });

  it('rejects a manifest where threat.technique.subtechnique.reference has ignore_above below the schema bound', () => {
    // The schema binds this field to .max(512). A keyword sub-field with
    // ignore_above: 10 triggers the ignore_above branch: "schema bound 512
    // exceeds the keyword sub-field's ignore_above 10".
    const foldedSet = makeMutatedFoldedSet((m) => {
      m['threat.technique.subtechnique.reference'] = { type: 'keyword', ignore_above: 10 };
    });
    expect(() => assertValidDefinition(def(), foldedSet)).toThrow(
      /exceeds the keyword sub-field's ignore_above/
    );
  });
});

// ---------------------------------------------------------------------------
// Leaf-path counter — used only by the leaf-count assertions above.
//
// This is a structural counter, not a compatibility checker. The compatibility
// check (total mapping) is delegated entirely to assertValidDefinition above,
// so a bug in that check would be caught by CI rather than reproduced here.
// ---------------------------------------------------------------------------

function collectLeafPaths(node: Record<string, unknown>, path: string): Set<string> {
  const out = new Set<string>();
  const nodeType = node.type;
  if (
    nodeType === 'string' ||
    nodeType === 'integer' ||
    nodeType === 'number' ||
    nodeType === 'boolean'
  ) {
    if (path) out.add(path);
    return out;
  }
  if (nodeType === 'object' && node.properties && typeof node.properties === 'object') {
    for (const [key, child] of Object.entries(
      node.properties as Record<string, Record<string, unknown>>
    )) {
      for (const p of collectLeafPaths(child, path ? `${path}.${key}` : key)) {
        out.add(p);
      }
    }
    return out;
  }
  if (
    nodeType === 'array' &&
    node.items !== undefined &&
    typeof node.items === 'object' &&
    !Array.isArray(node.items)
  ) {
    return collectLeafPaths(node.items as Record<string, unknown>, path);
  }
  const anyOf = node.anyOf ?? node.oneOf;
  if (Array.isArray(anyOf)) {
    for (const branch of anyOf as Record<string, unknown>[]) {
      for (const p of collectLeafPaths(branch as Record<string, unknown>, path)) {
        out.add(p);
      }
    }
  }
  return out;
}
