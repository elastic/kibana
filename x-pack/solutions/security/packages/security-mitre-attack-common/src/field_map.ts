/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Field map for the `.kibana-mitre-attack-{space}` index, consumed by
 * `@kbn/index-adapter`.
 *
 * The shape mirrors `MitreEntity` from `./types`. We intentionally keep a
 * single mapping that covers all three entity kinds (tactic / technique /
 * subtechnique) — the discriminator lives in the `type` field and queries
 * filter on it. Tactic-only or technique-only fields are non-required so the
 * mapping accepts any entity kind.
 */
export const mitreAttackFieldMap = {
  framework: { type: 'keyword', required: true },
  versions: { type: 'keyword', required: true, array: true },
  id: { type: 'keyword', required: true },
  type: { type: 'keyword', required: true },
  name: {
    type: 'keyword',
    required: true,
    multi_fields: [{ name: 'text', type: 'text', flat_name: 'name.text' }],
  },
  reference: { type: 'keyword', required: true },
  description: { type: 'text', required: true },
  tactics: { type: 'keyword', required: false, array: true },
  techniqueId: { type: 'keyword', required: false },
} as const;

export type MitreAttackFieldMap = typeof mitreAttackFieldMap;

/**
 * Name of the `semantic_text` field holding the embedded representation of an
 * entity. Only present in the mapping when semantic search is enabled and the
 * configured inference endpoint is reachable — a `semantic_text` field whose
 * `inference_id` cannot be resolved makes every index request fail, so the
 * field is added deliberately rather than unconditionally.
 */
export const MITRE_SEMANTIC_FIELD = 'semantic';

/**
 * Structural description of a single mapped field. Mirrors the subset of
 * `FieldMap` from `@kbn/index-adapter` that this package uses, redeclared here
 * so the package stays dependency-free.
 */
export interface MitreAttackFieldDefinition {
  type: string;
  required: boolean;
  array?: boolean;
  multi_fields?: ReadonlyArray<{ name: string; type: string; flat_name: string }>;
  inference_id?: string;
}

export type MitreAttackIndexFieldMap = Record<string, MitreAttackFieldDefinition>;

interface BuildMitreAttackFieldMapParams {
  /**
   * Inference endpoint backing the `semantic_text` field. When omitted the
   * mapping is byte-identical to `mitreAttackFieldMap`, which keeps the
   * keyword-only index exactly as it was before semantic search existed.
   */
  semanticInferenceId?: string;
}

export const buildMitreAttackFieldMap = ({
  semanticInferenceId,
}: BuildMitreAttackFieldMapParams = {}): MitreAttackIndexFieldMap => {
  if (!semanticInferenceId) {
    return { ...mitreAttackFieldMap };
  }

  return {
    ...mitreAttackFieldMap,
    [MITRE_SEMANTIC_FIELD]: {
      type: 'semantic_text',
      required: false,
      inference_id: semanticInferenceId,
    },
  };
};
