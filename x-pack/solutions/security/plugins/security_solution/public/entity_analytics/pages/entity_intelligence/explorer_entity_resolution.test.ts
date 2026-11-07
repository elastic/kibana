/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EntityType } from '../../../../common/entity_analytics/types';
import type { IntelligenceEntity } from './common';
import { EMPTY_EDGE_CONTEXT } from './event_context';
import { entityNodeId } from './graph_state';
import type { RelatedEntity } from './hooks/use_entity_relationships';
import { resolveExplorerEntity } from './explorer_entity_resolution';

const selected: IntelligenceEntity = {
  id: 'user:alex.chen@host-laptop-fin03@local',
  name: 'alex.chen@LAPTOP-FIN03',
  type: EntityType.user,
  identifierValue: 'alex.chen',
  riskScoreNorm: 79,
  riskLevel: 'High',
  criticality: undefined,
  source: undefined,
  lastSeen: undefined,
};
const root: RelatedEntity = {
  id: entityNodeId(EntityType.user, selected.identifierValue),
  name: selected.name,
  kind: EntityType.user,
  alertCount: 0,
  worstSeverity: undefined,
  context: EMPTY_EDGE_CONTEXT,
};
const sameUsername: IntelligenceEntity = {
  ...selected,
  id: 'user:alex.chen@host-gen-8@local',
  name: 'alex.chen@HOST-GEN-8',
  riskScoreNorm: 24,
  riskLevel: 'Low',
};

it('preserves the exact root entity and its risk even when its displayed name is decorated', () => {
  expect(resolveExplorerEntity(root, selected, [sameUsername, selected])).toBe(selected);
});

it('resolves the root even when the selected entity is outside the ranked entity list', () => {
  expect(resolveExplorerEntity(root, selected, [sameUsername])).toBe(selected);
});

it('does not assign an ambiguous neighboring username to an arbitrary canonical entity', () => {
  const host = {
    ...selected,
    id: 'host:host-laptop-fin03',
    name: 'LAPTOP-FIN03',
    type: EntityType.host,
    identifierValue: 'LAPTOP-FIN03',
  };
  expect(resolveExplorerEntity(root, host, [sameUsername, selected])).toBeUndefined();
});

it('resolves a unique neighbor using its graph identifier rather than its display name', () => {
  expect(resolveExplorerEntity({ ...root, name: 'Alex Chen' }, undefined, [selected])).toBe(
    selected
  );
});

it('requires both kind and raw graph identifier to identify the selected root', () => {
  expect(resolveExplorerEntity({ ...root, kind: EntityType.host }, selected, [])).toBeUndefined();
  expect(
    resolveExplorerEntity({ ...root, id: 'user:another.alex' }, selected, [selected])
  ).toBeUndefined();
});

it('does not treat duplicate list rows for the same canonical ID as different identities', () => {
  expect(resolveExplorerEntity(root, undefined, [selected, selected])).toBe(selected);
});
