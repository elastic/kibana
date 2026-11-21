/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Parser } from '@elastic/esql';
import {
  hostLikeFixture,
  k8sDeploymentOtelAndAgentFixture,
  k8sNodeFixture,
} from '../__fixtures__/definitions';
import { InventoryDefinitionError } from '../generator';
import { toClassicAlertDefinition } from './alert_identity';
import {
  buildClassicAlertCountQuery,
  CLASSIC_ALERT_INDICES,
  MAX_ALERT_COUNT_ROWS,
} from './classic_alert_count_query';

describe('toClassicAlertDefinition', () => {
  it('renames every field of a ranked identity and its presence filter to the alert grouping column', () => {
    const { identityField } = toClassicAlertDefinition(hostLikeFixture);

    expect(JSON.stringify(identityField)).not.toMatch(/"field":"(?!kibana\.alert\.grouping\.)/);
    expect(JSON.stringify(identityField)).toContain('"field":"kibana.alert.grouping.host.id"');
    expect(JSON.stringify(identityField)).toContain('"field":"kibana.alert.grouping.host.name"');
  });

  it('renames a single-field identity', () => {
    const { identityField } = toClassicAlertDefinition({
      ...hostLikeFixture,
      identityField: { singleField: 'k8s.node.name' },
    });

    expect(identityField).toEqual({ singleField: 'kibana.alert.grouping.k8s.node.name' });
  });

  it('does not change the definition it was given', () => {
    const before = JSON.stringify(hostLikeFixture);

    toClassicAlertDefinition(hostLikeFixture);

    expect(JSON.stringify(hostLikeFixture)).toBe(before);
  });

  it('rejects an identity with field evaluations', () => {
    expect(() =>
      toClassicAlertDefinition({
        ...hostLikeFixture,
        identityField: {
          ...hostLikeFixture.identityField,
          fieldEvaluations: [{ destination: 'entity.namespace', fallbackValue: 'local' }],
        },
      } as never)
    ).toThrow(InventoryDefinitionError);
  });
});

describe('buildClassicAlertCountQuery', () => {
  it.each([
    ['a ranked identity', hostLikeFixture],
    ['a composed ranked identity', k8sDeploymentOtelAndAgentFixture],
    [
      'a single field identity',
      { ...k8sNodeFixture, identityField: { singleField: 'k8s.node.name' } },
    ],
  ])('builds a query that parses for %s', (_name, definition) => {
    const { esql } = buildClassicAlertCountQuery(definition as never, 'default');

    expect(Parser.parse(esql).errors).toEqual([]);
  });

  it('counts distinct active alerts of the space per entity id over the classic alert indices', () => {
    const { esql, params } = buildClassicAlertCountQuery(hostLikeFixture, 'default');

    expect(esql).toContain(`FROM ${CLASSIC_ALERT_INDICES}`);
    expect(esql).toContain('`kibana.alert.status` == "active"');
    expect(esql).toContain('MV_CONTAINS(`kibana.space_ids`, ?spaceId)');
    expect(esql).toContain('COUNT_DISTINCT(`kibana.alert.uuid`) BY `entity.id`');
    expect(esql).toContain(`| LIMIT ${MAX_ALERT_COUNT_ROWS}`);
    expect(params).toEqual([{ spaceId: 'default' }]);
  });

  it('sends the space as a parameter and never in the query text', () => {
    const { esql, params } = buildClassicAlertCountQuery(hostLikeFixture, 'my"space');

    expect(esql).not.toContain('my"space');
    expect(params).toEqual([{ spaceId: 'my"space' }]);
  });

  it('reads the identity from the grouping columns and never from the plain fields', () => {
    const { esql } = buildClassicAlertCountQuery(hostLikeFixture, 'default');

    expect(esql).toContain('kibana.alert.grouping.host.id');
    expect(esql).toContain('kibana.alert.grouping.host.name');
    expect(esql).not.toMatch(/(?<!grouping\.)\bhost\.id\b/);
  });

  it('nullifies fields that no alert index maps, so a type nobody alerts on returns no rows', () => {
    const { esql } = buildClassicAlertCountQuery(hostLikeFixture, 'default');

    expect(esql.startsWith('SET unmapped_fields="nullify";')).toBe(true);
  });

  it('prefixes the entity type to the id the way the list query does', () => {
    const { esql } = buildClassicAlertCountQuery(
      { ...k8sNodeFixture, identityField: { singleField: 'k8s.node.name' } },
      'default'
    );

    expect(esql).toContain('CONCAT("k8s.node:"');
  });
});
