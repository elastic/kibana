/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MatchKey } from './types';

/**
 * PoC DECISIONS TO CLARIFY (see notes.md, "Field aliases"):
 *  - The entity column spelling is canonical, and it is the OpenTelemetry one.
 *  - Each column has at most one alias, its ECS spelling, which is what rules written against
 *    Elastic Agent or Metricbeat Kubernetes data group by.
 *  - A rule groups by one convention, so an alias applies to a whole key or not at all: a key is
 *    never matched with some columns in one spelling and some in the other.
 *  - The alias table lives here, not on the entity definition, and only aliases alert fields. The
 *    entity side still needs the canonical spelling in the data.
 */
export const ECS_ALIASES: Readonly<Record<string, string>> = {
  'k8s.pod.uid': 'kubernetes.pod.uid',
  'k8s.pod.name': 'kubernetes.pod.name',
  'k8s.namespace.name': 'kubernetes.namespace',
  'k8s.node.name': 'kubernetes.node.name',
  'k8s.deployment.name': 'kubernetes.deployment.name',
  'k8s.daemonset.name': 'kubernetes.daemonset.name',
  'k8s.statefulset.name': 'kubernetes.statefulset.name',
  'k8s.cluster.name': 'orchestrator.cluster.name',
};

/**
 * The ways a rule can have written a key's group-by columns. The first is the key itself. The
 * second, when every column has an ECS alias, is the key in ECS spelling, unless that is already
 * one of `keys` (a definition that ranks both spellings). Each variant lines up with the key,
 * column for column.
 */
export const aliasVariants = (key: MatchKey, keys: readonly MatchKey[] = []): MatchKey[] => {
  const aliased = key.map((column) => ECS_ALIASES[column]);
  const variants: MatchKey[] = [key];
  const isAnotherKey = (variant: MatchKey): boolean =>
    keys.some((other) => JSON.stringify(other) === JSON.stringify(variant));
  if (aliased.every((alias): alias is string => alias !== undefined) && !isAnotherKey(aliased)) {
    variants.push(aliased);
  }
  return variants;
};
