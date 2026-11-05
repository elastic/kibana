/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RegistrableEntityDefinition } from '@kbn/entity-store/server';
import type { MatchKey } from './types';

type MatchableDefinition = Pick<RegistrableEntityDefinition, 'type' | 'identityField'>;

/** One key per way the identity is written: the single field, or each composition of the ranking. */
const identityKeys = ({ identityField }: MatchableDefinition): MatchKey[] =>
  'singleField' in identityField
    ? [[identityField.singleField]]
    : identityField.euidRanking.branches.flatMap(({ ranking }) =>
        ranking.map((composition) =>
          composition.flatMap((part) => ('field' in part ? [part.field] : []))
        )
      );

/** Keys for rules that group by something other than the identity, where the entity carries it too. */
const EXTRA_MATCH_KEYS: Readonly<Record<string, readonly MatchKey[]>> = {
  'k8s.pod': [['k8s.pod.name', 'k8s.namespace.name']],
};

/**
 * The entity columns an alert can be matched on. They come from the definition's identity, plus
 * any extra keys. An alert is counted once however many keys it satisfies.
 *
 * A key matches an alert whose grouping carries those fields, whatever else it groups by, so an
 * alert grouped by namespace and pod name also satisfies a namespace key: counts of an entity that
 * contains others include their alerts.
 */
export const getMatchKeys = (definition: MatchableDefinition): readonly MatchKey[] => {
  const keys = new Map<string, MatchKey>();
  [...identityKeys(definition), ...(EXTRA_MATCH_KEYS[definition.type] ?? [])]
    .filter((key) => key.length > 0)
    .forEach((key) => keys.set(JSON.stringify(key), key));
  return [...keys.values()];
};
