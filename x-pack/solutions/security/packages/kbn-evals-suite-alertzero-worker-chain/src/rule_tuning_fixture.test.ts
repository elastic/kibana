/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildRuleTuningWorld } from './rule_tuning_fixture';

it.each(['encoded-powershell', 'mimicrat-clickfix'] as const)(
  '%s seeds a TP and twelve closed FPs on the same isolated rule',
  (family) => {
    const world = buildRuleTuningWorld(family, 'unique-run', 'isolated-rule');
    expect(world.alerts).toHaveLength(13);
    expect(new Set(world.alerts.map(({ id }) => id)).size).toBe(13);
    expect(
      world.alerts.every(({ source }) => source['kibana.alert.rule.uuid'] === 'isolated-rule')
    ).toBe(true);
    expect(
      world.alerts.filter(
        ({ source }) => source['kibana.alert.workflow_reason'] === 'false_positive'
      )
    ).toHaveLength(12);
    expect(world.alerts[12].source['kibana.alert.workflow_reason']).toBe('true_positive');
    expect(world.events.length).toBeGreaterThan(0);
    expect(world.entities.length).toBeGreaterThan(0);
    expect(world.attack).toBeUndefined();
  }
);
