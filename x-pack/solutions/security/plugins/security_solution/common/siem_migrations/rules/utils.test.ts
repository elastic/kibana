/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { OriginalRule } from '../model/rule_migration.gen';
import { SENTINEL_NRT_RULE_KIND, SENTINEL_SCHEDULED_RULE_KIND } from '../parsers/sentinel/types';
import { SENTINEL_RULE_KIND_ANNOTATION_KEY } from '../constants';
import {
  convertMigrationCustomRuleToSecurityRulePayload,
  getTranslationFieldsFromAnnotations,
  type MigrationCustomRule,
} from './utils';

const customRule: MigrationCustomRule = {
  title: 'Translated Sentinel rule',
  description: 'Translated rule description',
  query: 'FROM logs-*',
  query_language: 'esql',
  severity: 'medium',
  risk_score: 47,
};

const originalRule: OriginalRule = {
  id: 'sentinel-rule-id',
  vendor: 'microsoft-sentinel',
  title: 'Sentinel rule',
  description: 'Sentinel rule description',
  query: 'SecurityEvent | where EventID == 1102',
  query_language: 'kql',
};

describe('convertMigrationCustomRuleToSecurityRulePayload', () => {
  it('uses the default translation schedule when no overrides are provided', () => {
    expect(convertMigrationCustomRuleToSecurityRulePayload(customRule, false)).toMatchObject({
      from: 'now-360s',
      to: 'now',
      interval: '5m',
    });
  });

  it('uses translation fields when provided', () => {
    expect(
      convertMigrationCustomRuleToSecurityRulePayload(customRule, false, {
        from: 'now-60s',
        to: 'now',
        interval: '60s',
      })
    ).toMatchObject({
      from: 'now-60s',
      to: 'now',
      interval: '60s',
    });
  });
});

describe('getTranslationFieldsFromAnnotations', () => {
  it('uses timing overrides from original rule annotations', () => {
    expect(
      getTranslationFieldsFromAnnotations({
        ...originalRule,
        annotations: {
          from: 'now-1h',
          to: 'now',
          interval: '20m',
          timestamp_override: 'event.ingested',
          ignored_annotation: 'do not copy',
        },
      })
    ).toEqual({
      from: 'now-1h',
      to: 'now',
      interval: '20m',
    });
  });

  it('uses Sentinel NRT query frequency default when no interval annotation is present', () => {
    expect(
      getTranslationFieldsFromAnnotations({
        ...originalRule,
        annotations: {
          [SENTINEL_RULE_KIND_ANNOTATION_KEY]: SENTINEL_NRT_RULE_KIND,
        },
      })
    ).toEqual({
      from: 'now-360s',
      to: 'now',
      interval: '1m',
    });
  });

  it('uses shared defaults for Scheduled Sentinel rules without timing annotations', () => {
    expect(
      getTranslationFieldsFromAnnotations({
        ...originalRule,
        annotations: {
          [SENTINEL_RULE_KIND_ANNOTATION_KEY]: SENTINEL_SCHEDULED_RULE_KIND,
        },
      })
    ).toEqual({
      from: 'now-360s',
      to: 'now',
      interval: '5m',
    });
  });

  it('uses shared interval default for non-Sentinel rules without interval annotation', () => {
    expect(
      getTranslationFieldsFromAnnotations({
        ...originalRule,
        vendor: 'qradar',
        annotations: undefined,
      })
    ).toEqual({
      from: 'now-360s',
      to: 'now',
      interval: '5m',
    });
  });
});
