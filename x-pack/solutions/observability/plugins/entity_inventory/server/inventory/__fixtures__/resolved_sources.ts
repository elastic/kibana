/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityDefinitionWithoutId } from '@kbn/entity-store/common';
import type { IndexMode, ResolvedSource } from '../generator';

/** An illustrative backing index name for a pattern, its wildcards replaced. */
export const backingIndexOf = (indexPattern: string): string =>
  `.ds-${indexPattern.replace(/[*?]/g, 'x')}-2026.10.19-000001`;

/** Resolves every source of a definition to one backing index of the given mode. */
export const resolveAllAs = (
  definition: EntityDefinitionWithoutId,
  mode: IndexMode
): ResolvedSource[] =>
  (definition.dynamic?.sources ?? []).map(({ indexPattern }) => ({
    indices: [{ name: backingIndexOf(indexPattern), mode }],
  }));
