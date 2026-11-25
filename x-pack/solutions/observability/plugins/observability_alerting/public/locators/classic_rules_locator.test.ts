/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERTING_V2_CLASSIC_RULES_LOCATOR } from '@kbn/alerting-v2-constants';
import {
  OBSERVABILITY_ALERTING_APP_ID,
  OBSERVABILITY_ALERTING_RULES_V1_PATH,
} from '@kbn/deeplinks-observability';
import { classicRulesLocatorDefinition } from './classic_rules_locator';

describe('classicRulesLocatorDefinition', () => {
  it('uses the shared classic rules locator id', () => {
    expect(classicRulesLocatorDefinition.id).toBe(ALERTING_V2_CLASSIC_RULES_LOCATOR);
  });

  it('resolves to the Observability Alerting classic rules tab', async () => {
    expect(await classicRulesLocatorDefinition.getLocation({})).toEqual({
      app: OBSERVABILITY_ALERTING_APP_ID,
      path: OBSERVABILITY_ALERTING_RULES_V1_PATH,
      state: {},
    });
  });
});
