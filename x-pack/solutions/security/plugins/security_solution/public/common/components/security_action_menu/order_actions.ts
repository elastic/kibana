/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SECURITY_ACTION_MENU_PRESET_ORDER } from './presets';
import type {
  SecurityActionMenuActionId,
  SecurityActionMenuContribution,
  SecurityActionMenuPreset,
} from './types';

const validateContributions = (contributions: readonly SecurityActionMenuContribution[]): void => {
  const ids = new Set<SecurityActionMenuActionId>();

  contributions.forEach(({ id, placement }) => {
    if (ids.has(id)) {
      throw new Error(`Security action "${id}" was contributed more than once`);
    }
    ids.add(id);

    if (placement?.before != null && placement.after != null) {
      throw new Error(`Security action "${id}" cannot define both before and after placement`);
    }
    if (placement?.before === id || placement?.after === id) {
      throw new Error(`Security action "${id}" cannot be placed relative to itself`);
    }
  });

  const visitState = new Map<SecurityActionMenuActionId, 'visiting' | 'visited'>();
  const placementTargets = new Map<SecurityActionMenuActionId, SecurityActionMenuActionId>();
  contributions.forEach(({ id, placement }) => {
    const target = placement?.before ?? placement?.after;
    if (target != null && ids.has(target)) {
      placementTargets.set(id, target);
    }
  });

  const visit = (id: SecurityActionMenuActionId): void => {
    const state = visitState.get(id);
    if (state === 'visiting') {
      throw new Error(`Security action placement contains a cycle involving "${id}"`);
    }
    if (state === 'visited') {
      return;
    }

    visitState.set(id, 'visiting');
    const target = placementTargets.get(id);
    if (target != null) {
      visit(target);
    }
    visitState.set(id, 'visited');
  };

  contributions.forEach(({ id }) => visit(id));
};

export const orderSecurityActionMenuContributions = ({
  preset,
  contributions,
  actionOrder = [],
}: {
  preset?: SecurityActionMenuPreset;
  contributions: readonly SecurityActionMenuContribution[];
  actionOrder?: readonly SecurityActionMenuActionId[];
}): SecurityActionMenuContribution[] => {
  validateContributions(contributions);

  const defaultOrder = preset == null ? [] : SECURITY_ACTION_MENU_PRESET_ORDER[preset];
  const defaultOrderIndex = new Map(defaultOrder.map((id, index) => [id, index]));
  let ordered = contributions
    .map((contribution, index) => ({ contribution, index }))
    .sort((left, right) => {
      const leftOrder = defaultOrderIndex.get(left.contribution.id) ?? Number.MAX_SAFE_INTEGER;
      const rightOrder = defaultOrderIndex.get(right.contribution.id) ?? Number.MAX_SAFE_INTEGER;
      return leftOrder - rightOrder || left.index - right.index;
    })
    .map(({ contribution }) => contribution);

  const requestedOrder = [...new Set(actionOrder)];
  if (requestedOrder.length > 0) {
    const requestedOrderSet = new Set(requestedOrder);
    const contributionsById = new Map(
      ordered.map((contribution) => [contribution.id, contribution])
    );
    ordered = [
      ...requestedOrder.flatMap((id) => {
        const contribution = contributionsById.get(id);
        return contribution == null ? [] : [contribution];
      }),
      ...ordered.filter(({ id }) => !requestedOrderSet.has(id)),
    ];
  }

  const contributionsById = new Map(ordered.map((contribution) => [contribution.id, contribution]));
  const outgoing = new Map<SecurityActionMenuActionId, Set<SecurityActionMenuActionId>>(
    ordered.map(({ id }) => [id, new Set<SecurityActionMenuActionId>()] as const)
  );
  const incomingCount = new Map<SecurityActionMenuActionId, number>(
    ordered.map(({ id }) => [id, 0])
  );

  ordered.forEach(({ id, placement }) => {
    const beforeId = placement?.before;
    const afterId = placement?.after;
    const sourceId = beforeId != null ? id : afterId;
    const targetId = beforeId ?? (afterId != null ? id : undefined);

    if (
      sourceId == null ||
      targetId == null ||
      !contributionsById.has(sourceId) ||
      !contributionsById.has(targetId)
    ) {
      return;
    }

    const targets = outgoing.get(sourceId);
    if (targets != null && !targets.has(targetId)) {
      targets.add(targetId);
      incomingCount.set(targetId, (incomingCount.get(targetId) ?? 0) + 1);
    }
  });

  const result: SecurityActionMenuContribution[] = [];
  const remainingIds = new Set(ordered.map(({ id }) => id));
  while (remainingIds.size > 0) {
    const next = ordered.find(
      ({ id }) => remainingIds.has(id) && (incomingCount.get(id) ?? 0) === 0
    );
    if (next == null) {
      throw new Error('Security action placement contains a cycle');
    }

    result.push(next);
    remainingIds.delete(next.id);
    outgoing.get(next.id)?.forEach((targetId) => {
      incomingCount.set(targetId, (incomingCount.get(targetId) ?? 0) - 1);
    });
  }

  return result;
};
