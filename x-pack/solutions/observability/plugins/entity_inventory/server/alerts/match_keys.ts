/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RegistrableEntityDefinition } from '@kbn/entity-store/server';
import type { MatchKey, MatchKeyEntry } from './types';

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
 * The entity columns an alert can be matched on, each with where it came from. They come from the
 * definition's identity, plus any extra keys. A key that repeats an earlier one is dropped.
 */
export const getMatchKeyEntries = (definition: MatchableDefinition): readonly MatchKeyEntry[] => {
  const entries = new Map<string, MatchKeyEntry>();
  const add = (columns: MatchKey, source: MatchKeyEntry['source']) => {
    const id = JSON.stringify(columns);
    if (columns.length > 0 && !entries.has(id)) {
      entries.set(id, { columns, source });
    }
  };
  identityKeys(definition).forEach((columns, index) =>
    add(columns, { kind: 'identity', rank: index + 1 })
  );
  (EXTRA_MATCH_KEYS[definition.type] ?? []).forEach((columns) => add(columns, { kind: 'extra' }));
  return [...entries.values()];
};

/**
 * The entity columns an alert can be matched on. An alert is counted once however many keys it
 * satisfies.
 *
 * A key matches an alert whose grouping carries those fields, whatever else it groups by, so an
 * alert grouped by namespace and pod name also satisfies a namespace key: counts of an entity that
 * contains others include their alerts.
 */
export const getMatchKeys = (definition: MatchableDefinition): readonly MatchKey[] =>
  getMatchKeyEntries(definition).map(({ columns }) => columns);
