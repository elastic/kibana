/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  INVENTORY_DEFINITION_FIXTURES,
  hostLikeFixture,
  k8sDeploymentFixture,
  k8sNodeFixture,
} from '../__fixtures__/definitions';
import { InventoryDefinitionError } from './errors';
import { resolveIdentityPlan } from './identity';
import { assertParses } from './parse_guard';

describe('resolveIdentityPlan', () => {
  it.each([
    [
      k8sDeploymentFixture.type,
      k8sDeploymentFixture,
      ['kubernetes.namespace', 'kubernetes.deployment.name'],
    ],
    [k8sNodeFixture.type, k8sNodeFixture, ['kubernetes.node.name']],
    [hostLikeFixture.type, hostLikeFixture, ['host.id', 'host.name']],
  ] as const)('resolves the grouping fields of %s', (_type, definition, groupingFields) => {
    expect(resolveIdentityPlan(definition).groupingFields).toEqual(groupingFields);
  });

  it.each([
    [
      hostLikeFixture.type,
      hostLikeFixture,
      [
        'host_id_present',
        'host_name_present',
        'host_id_present_or_null',
        'host_name_present_or_null',
      ],
    ],
    [
      k8sDeploymentFixture.type,
      k8sDeploymentFixture,
      [
        'kubernetes_namespace_present',
        'kubernetes_deployment_name_present',
        'kubernetes_namespace_present_or_null',
        'kubernetes_deployment_name_present_or_null',
      ],
    ],
    [k8sNodeFixture.type, k8sNodeFixture, []],
  ] as const)(
    'reads the helper columns of %s from the id evaluation',
    (_type, definition, names) => {
      expect(resolveIdentityPlan(definition).helperColumns).toEqual(names);
    }
  );

  it.each(INVENTORY_DEFINITION_FIXTURES.map((definition) => [definition.type, definition]))(
    'the presence filter of %s mentions every grouping field and nothing else',
    (_type, definition) => {
      const { groupingFields, presenceFilter } = resolveIdentityPlan(definition);
      const withoutStrings = presenceFilter.replace(/"(?:[^"\\]|\\.)*"/g, '""');
      const keywords = new Set(['AND', 'OR', 'NOT', 'IS', 'NULL', 'TO_STRING']);
      const identifiers = new Set(
        (withoutStrings.match(/`[^`]+`|[A-Za-z_@][\w.@]*/g) ?? [])
          .map((token) => token.replace(/^`|`$/g, ''))
          .filter((token) => !keywords.has(token))
      );
      expect([...identifiers].sort()).toEqual([...groupingFields].sort());
    }
  );

  it.each(INVENTORY_DEFINITION_FIXTURES.map((definition) => [definition.type, definition]))(
    'the id evaluation of %s assigns entity.id and prefixes the type',
    (type, definition) => {
      const { idEvaluation } = resolveIdentityPlan(definition);
      const assignments = idEvaluation.split(/,\n\s*/);
      expect(assignments[assignments.length - 1]).toMatch(/^entity\.id = /);
      expect(idEvaluation).toContain(`"${type}:"`);
    }
  );

  it.each(INVENTORY_DEFINITION_FIXTURES.map((definition) => [definition.type, definition]))(
    'the presence filter of %s is parenthesised so it can be ANDed',
    (_type, definition) => {
      const { presenceFilter } = resolveIdentityPlan(definition);
      expect(presenceFilter.startsWith('(')).toBe(true);
      expect(presenceFilter.endsWith(')')).toBe(true);
    }
  );

  it.each(INVENTORY_DEFINITION_FIXTURES.map((definition) => [definition.type, definition]))(
    'matches the store output for %s',
    (_type, definition) => {
      const { presenceFilter, idEvaluation } = resolveIdentityPlan(definition);
      expect({ presenceFilter, idEvaluation }).toMatchSnapshot();
    }
  );

  it.each(INVENTORY_DEFINITION_FIXTURES.map((definition) => [definition.type, definition]))(
    'the identity output of %s parses in a query',
    (_type, definition) => {
      const { groupingFields, presenceFilter, idEvaluation } = resolveIdentityPlan(definition);
      const esql = `FROM x | WHERE ${presenceFilter} | STATS c = COUNT(*) BY ${groupingFields.join(
        ', '
      )} | EVAL ${idEvaluation}`;
      expect(() => assertParses(esql)).not.toThrow();
    }
  );

  it('throws InventoryDefinitionError for a definition without dynamic', () => {
    const { dynamic, ...withoutDynamic } = k8sNodeFixture;
    expect(() => resolveIdentityPlan(withoutDynamic)).toThrow(InventoryDefinitionError);
    expect(() => resolveIdentityPlan(withoutDynamic)).toThrow(/no dynamic block/);
  });
});
