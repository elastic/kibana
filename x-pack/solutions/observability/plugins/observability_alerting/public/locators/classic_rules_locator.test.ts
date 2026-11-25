/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { classicRulesLocatorDefinition } from './classic_rules_locator';

describe('classicRulesLocatorDefinition', () => {
  it('registers under the id Discover looks up', () => {
    expect(classicRulesLocatorDefinition.id).toBe('ALERTING_V2_CLASSIC_RULES_LOCATOR');
  });

  it('resolves to the Classic tab of the Observability Alerting rules page', async () => {
    expect(await classicRulesLocatorDefinition.getLocation({})).toEqual({
      app: 'observabilityAlerting',
      path: '/rules/classic',
      state: {},
    });
  });
});
