/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IntelligenceEntity } from './common';
import { entityNodeId } from './graph_state';
import type { RelatedEntity } from './hooks/use_entity_relationships';

/** Resolves a graph node without confusing its display name with a canonical entity identity. */
export const resolveExplorerEntity = (
  related: RelatedEntity,
  selectedEntity: IntelligenceEntity | undefined,
  entities: readonly IntelligenceEntity[]
): IntelligenceEntity | undefined => {
  if (
    selectedEntity?.type === related.kind &&
    related.id === entityNodeId(related.kind, selectedEntity.identifierValue)
  ) {
    return selectedEntity;
  }
  const matches = new Map(
    entities
      .filter(
        (candidate) =>
          candidate.type === related.kind &&
          related.id === entityNodeId(related.kind, candidate.identifierValue)
      )
      .map((candidate) => [candidate.id, candidate])
  );
  return matches.size === 1 ? [...matches.values()][0] : undefined;
};
