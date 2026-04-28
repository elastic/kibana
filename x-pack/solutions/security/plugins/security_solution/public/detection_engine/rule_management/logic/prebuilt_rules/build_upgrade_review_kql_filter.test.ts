/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RuleCustomizationStatus } from '../../../../../common/api/detection_engine';
import { buildUpgradeReviewKqlFilter } from './build_upgrade_review_kql_filter';

describe('buildUpgradeReviewKqlFilter', () => {
  it('returns undefined for an undefined options object', () => {
    expect(buildUpgradeReviewKqlFilter(undefined)).toBeUndefined();
  });

  it('returns undefined for an empty options object', () => {
    expect(buildUpgradeReviewKqlFilter({})).toBeUndefined();
  });

  it('builds a tags-only clause wrapped in parentheses (alert field path)', () => {
    expect(buildUpgradeReviewKqlFilter({ tags: ['tag-a', 'tag-b'] })).toBe(
      '(alert.attributes.tags:("tag-a" AND "tag-b"))'
    );
  });

  it('builds a customized-only clause for CUSTOMIZED status', () => {
    expect(
      buildUpgradeReviewKqlFilter({
        customizationStatus: RuleCustomizationStatus.CUSTOMIZED,
      })
    ).toBe('(alert.attributes.params.ruleSource.isCustomized: true)');
  });

  it('builds a not-customized clause for NOT_CUSTOMIZED status', () => {
    expect(
      buildUpgradeReviewKqlFilter({
        customizationStatus: RuleCustomizationStatus.NOT_CUSTOMIZED,
      })
    ).toBe('(NOT alert.attributes.params.ruleSource.isCustomized: true)');
  });

  it('ANDs tags with customization status when both are present', () => {
    expect(
      buildUpgradeReviewKqlFilter({
        tags: ['tag-a'],
        customizationStatus: RuleCustomizationStatus.CUSTOMIZED,
      })
    ).toBe(
      '(alert.attributes.tags:("tag-a") AND alert.attributes.params.ruleSource.isCustomized: true)'
    );
  });

  it('folds a single ruleIds entry into the KQL via `alert.attributes.params.ruleId`', () => {
    expect(buildUpgradeReviewKqlFilter({ ruleIds: ['rule-a'] })).toBe(
      '(alert.attributes.params.ruleId:("rule-a"))'
    );
  });

  it('ORs multiple ruleIds together under a single `alert.attributes.params.ruleId` clause', () => {
    expect(buildUpgradeReviewKqlFilter({ ruleIds: ['rule-a', 'rule-b'] })).toBe(
      '(alert.attributes.params.ruleId:("rule-a" OR "rule-b"))'
    );
  });

  it('ANDs ruleIds with the structured filter clauses', () => {
    expect(
      buildUpgradeReviewKqlFilter({
        tags: ['tag-a'],
        customizationStatus: RuleCustomizationStatus.CUSTOMIZED,
        ruleIds: ['rule-a'],
      })
    ).toBe(
      '(alert.attributes.tags:("tag-a") AND alert.attributes.params.ruleSource.isCustomized: true) AND (alert.attributes.params.ruleId:("rule-a"))'
    );
  });

  it('returns undefined when only an empty ruleIds array is provided', () => {
    expect(buildUpgradeReviewKqlFilter({ ruleIds: [] })).toBeUndefined();
  });
});
