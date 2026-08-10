/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SecurityActionMenuContribution, SecurityActionMenuPreset } from './types';

const validateContributions = (contributions: readonly SecurityActionMenuContribution[]): void => {
  const ids = new Set<string>();

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

  const visitState = new Map<string, 'visiting' | 'visited'>();
  const placementTargets = new Map<string, string>();
  contributions.forEach(({ id, placement }) => {
    const target = placement?.before ?? placement?.after;
    if (target != null && ids.has(target)) {
      placementTargets.set(id, target);
    }
  });

  const visit = (id: string): void => {
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

export const orderSecurityActionMenuContributions = <
  TActionId extends string,
  TGroupId extends string
>({
  preset,
  contributions,
  actionOrder = [],
}: {
  preset?: SecurityActionMenuPreset<TActionId, TGroupId>;
  contributions: readonly SecurityActionMenuContribution<TActionId>[];
  actionOrder?: readonly string[];
}): Array<SecurityActionMenuContribution<TActionId>> => {
  validateContributions(contributions);

  const defaultOrder = preset?.groups.flatMap(({ actionIds }) => actionIds) ?? [];
  const defaultOrderIndex = new Map<string, number>(defaultOrder.map((id, index) => [id, index]));
  let ordered = contributions
    .map((contribution, index) => ({ contribution, index }))
    .sort((left, right) => {
      const leftOrder = defaultOrderIndex.get(left.contribution.id) ?? Number.MAX_SAFE_INTEGER;
      const rightOrder = defaultOrderIndex.get(right.contribution.id) ?? Number.MAX_SAFE_INTEGER;
      return leftOrder - rightOrder || left.index - right.index;
    })
    .map(({ contribution }) => contribution);
  const contributionsById = new Map<string, SecurityActionMenuContribution<TActionId>>(
    ordered.map((contribution) => [contribution.id, contribution])
  );

  const requestedOrder = [...new Set(actionOrder)];
  if (requestedOrder.length > 0) {
    const requestedOrderSet = new Set(requestedOrder);
    ordered = [
      ...requestedOrder.flatMap((id) => {
        const contribution = contributionsById.get(id);
        return contribution == null ? [] : [contribution];
      }),
      ...ordered.filter(({ id }) => !requestedOrderSet.has(id)),
    ];
  }

  const outgoing = new Map<string, Set<string>>(
    ordered.map(({ id }) => [id, new Set<string>()] as const)
  );
  const incomingCount = new Map<string, number>(ordered.map(({ id }) => [id, 0]));

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

  const result: Array<SecurityActionMenuContribution<TActionId>> = [];
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
