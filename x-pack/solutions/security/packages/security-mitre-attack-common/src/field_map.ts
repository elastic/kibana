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
