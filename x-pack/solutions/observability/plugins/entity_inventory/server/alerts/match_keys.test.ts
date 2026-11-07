/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getIdentityFields, getPresenceFilter } from '@kbn/entity-store/common';
import { hostLikeFixture } from '../inventory/__fixtures__/definitions';
import {
  K8S_ENTITY_DEFINITIONS,
  k8sDeploymentDefinition,
  k8sNodeDefinition,
  k8sPodDefinition,
} from '../inventory/definitions/k8s_definitions';
import { getMatchKeyEntries, getMatchKeys } from './match_keys';

describe('getMatchKeys', () => {
  it('uses a single identity field as the key', () => {
    expect(getMatchKeys(k8sNodeDefinition)).toEqual([['k8s.node.name']]);
  });

  it('uses the fields of a composed identity as one key, without the separator', () => {
    expect(getMatchKeys(k8sDeploymentDefinition)).toEqual([
      ['k8s.namespace.name', 'k8s.deployment.name'],
    ]);
  });

  it('gives a ranked identity one key per ranking, so an alert grouped by any of them matches', () => {
    expect(getMatchKeys(hostLikeFixture)).toEqual([['host.id'], ['host.name']]);
  });

  it('adds the extra keys of a type to the ones its identity gives', () => {
    expect(getMatchKeys(k8sPodDefinition)).toEqual([
      ['k8s.pod.uid'],
      ['k8s.pod.name', 'k8s.namespace.name'],
    ]);
  });

  it('says where each key came from', () => {
    expect(getMatchKeyEntries(hostLikeFixture)).toEqual([
      { columns: ['host.id'], source: { kind: 'identity', rank: 1 } },
      { columns: ['host.name'], source: { kind: 'identity', rank: 2 } },
    ]);
    expect(getMatchKeyEntries(k8sPodDefinition).map(({ source }) => source)).toEqual([
      { kind: 'identity', rank: 1 },
      { kind: 'extra' },
    ]);
  });

  it('lists a key once when an extra key repeats an identity key', () => {
    const definition = {
      type: 'k8s.pod',
      identityField: {
        euidRanking: {
          branches: [
            {
              ranking: [[{ field: 'k8s.pod.name' }, { sep: '/' }, { field: 'k8s.namespace.name' }]],
            },
          ],
        },
        documentsFilter: getPresenceFilter([['k8s.pod.name', 'k8s.namespace.name']]),
      },
    };

    expect(getMatchKeys(definition)).toEqual([['k8s.pod.name', 'k8s.namespace.name']]);
  });

  it.each(K8S_ENTITY_DEFINITIONS.map((definition) => [definition.type, definition] as const))(
    '%s has keys, and every column of them is an identity field or an attribute of the type',
    (_type, definition) => {
      const attributes = (definition.dynamic?.sources ?? []).flatMap(({ attributes: names = [] }) =>
        names.map(({ name }) => name)
      );
      const available = new Set([...getIdentityFields(definition.identityField), ...attributes]);
      const keys = getMatchKeys(definition);

      expect(keys.length).toBeGreaterThan(0);
      keys.flat().forEach((column) => expect(available).toContain(column));
    }
  );
});
