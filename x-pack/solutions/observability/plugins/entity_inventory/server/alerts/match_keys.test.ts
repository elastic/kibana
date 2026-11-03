/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getIdentityFields } from '@kbn/entity-store/common';
import { K8S_ENTITY_DEFINITIONS } from '../inventory/definitions/k8s_definitions';
import { ALERT_MATCH_KEYS, getMatchKeys } from './match_keys';

const columnsOf = (type: string): Set<string> => {
  const definition = K8S_ENTITY_DEFINITIONS.find((candidate) => candidate.type === type);
  const attributes = (definition?.dynamic?.sources ?? []).flatMap(({ attributes: names = [] }) =>
    names.map(({ name }) => name)
  );
  return new Set([
    ...(definition ? getIdentityFields(definition.identityField) : []),
    ...attributes,
  ]);
};

describe('ALERT_MATCH_KEYS', () => {
  it('has keys for every registered k8s type', () => {
    expect(Object.keys(ALERT_MATCH_KEYS).sort()).toEqual(
      K8S_ENTITY_DEFINITIONS.map(({ type }) => type).sort()
    );
  });

  it.each(Object.entries(ALERT_MATCH_KEYS))(
    '%s reads only columns its definition lists as identity or attributes',
    (type, keys) => {
      const available = columnsOf(type);

      keys.flat().forEach(({ entityColumn }) => expect(available).toContain(entityColumn));
    }
  );

  it.each(Object.entries(ALERT_MATCH_KEYS))('%s keys read the grouping object', (_type, keys) => {
    keys.flat().forEach(({ entityColumn, alertField }) => {
      expect(alertField).toBe(`kibana.alert.grouping.${entityColumn}`);
    });
  });

  it('offers a pod both a uid key and a name and namespace key', () => {
    expect(
      getMatchKeys('k8s.pod').map((key) => key.map(({ entityColumn }) => entityColumn))
    ).toEqual([['k8s.pod.uid'], ['k8s.pod.name', 'k8s.namespace.name']]);
  });

  it('has no keys for an unknown type', () => {
    expect(getMatchKeys('not.a.type')).toEqual([]);
  });
});
