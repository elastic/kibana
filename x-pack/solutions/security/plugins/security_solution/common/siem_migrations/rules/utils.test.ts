/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SENTINEL_NRT_TRANSLATION_FIELDS } from '../constants';
import { convertMigrationCustomRuleToSecurityRulePayload, type MigrationCustomRule } from './utils';

const customRule: MigrationCustomRule = {
  title: 'Translated Sentinel rule',
  description: 'Translated rule description',
  query: 'FROM logs-*',
  query_language: 'esql',
  severity: 'medium',
  risk_score: 47,
};

describe('convertMigrationCustomRuleToSecurityRulePayload', () => {
  it('uses the default translation schedule when no overrides are provided', () => {
    expect(convertMigrationCustomRuleToSecurityRulePayload(customRule, false)).toMatchObject({
      from: 'now-360s',
      to: 'now',
      interval: '5m',
    });
  });

  it('uses NRT translation fields when provided', () => {
    expect(
      convertMigrationCustomRuleToSecurityRulePayload(
        customRule,
        false,
        SENTINEL_NRT_TRANSLATION_FIELDS
      )
    ).toMatchObject({
      from: 'now-60s',
      to: 'now',
      interval: '60s',
    });
  });
});
