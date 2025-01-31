/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleSchedule } from '../../../../../../common/api/detection_engine/model/rule_schema/rule_schedule';
import type { ThreeWayDiff } from '../../../../../../common/api/detection_engine';
import { getFieldDiffsForRuleSchedule } from './get_field_diffs_for_grouped_fields';

describe('getFieldDiffsForRuleSchedule', () => {
  describe('full rule schedule', () => {
    it('returns interval diff', () => {
      const result = getFieldDiffsForRuleSchedule({
        current_version: {
          interval: '10m',
          from: 'now-8m',
          to: 'now',
        },
        target_version: {
          interval: '11m',
          from: 'now-8m',
          to: 'now',
        },
      } as ThreeWayDiff<RuleSchedule>);

      expect(result).toEqual([
        {
          fieldName: 'interval',
          currentVersion: '10m',
          targetVersion: '11m',
        },
      ]);
    });

    it('returns from diff', () => {
      const result = getFieldDiffsForRuleSchedule({
        current_version: {
          interval: '10m',
          from: 'now-8m',
          to: 'now',
        },
        target_version: {
          interval: '10m',
          from: 'now-7m',
          to: 'now',
        },
      } as ThreeWayDiff<RuleSchedule>);

      expect(result).toEqual([
        {
          fieldName: 'from',
          currentVersion: 'now-8m',
          targetVersion: 'now-7m',
        },
      ]);
    });

    it('returns to diff', () => {
      const result = getFieldDiffsForRuleSchedule({
        current_version: {
          interval: '10m',
          from: 'now-5m',
          to: 'now',
        },
        target_version: {
          interval: '10m',
          from: 'now-5m',
          to: 'now-2m',
        },
      } as ThreeWayDiff<RuleSchedule>);

      expect(result).toEqual([
        {
          fieldName: 'to',
          currentVersion: 'now',
          targetVersion: 'now-2m',
        },
      ]);
    });

    it('returns full diff', () => {
      const result = getFieldDiffsForRuleSchedule({
        current_version: {
          interval: '10m',
          from: 'now-5m',
          to: 'now',
        },
        target_version: {
          interval: '11m',
          from: 'now-6m',
          to: 'now-2m',
        },
      } as ThreeWayDiff<RuleSchedule>);

      expect(result).toEqual([
        {
          fieldName: 'interval',
          currentVersion: '10m',
          targetVersion: '11m',
        },
        {
          fieldName: 'from',
          currentVersion: 'now-5m',
          targetVersion: 'now-6m',
        },
        {
          fieldName: 'to',
          currentVersion: 'now',
          targetVersion: 'now-2m',
        },
      ]);
    });

    it('returns full diff when current lookback is negative', () => {
      const result = getFieldDiffsForRuleSchedule({
        current_version: {
          interval: '10m',
          from: 'now-5m',
          to: 'now',
        },
        target_version: {
          interval: '11m',
          from: 'now-15m',
          to: 'now',
        },
      } as ThreeWayDiff<RuleSchedule>);

      expect(result).toEqual([
        {
          fieldName: 'interval',
          currentVersion: '10m',
          targetVersion: '11m',
        },
        {
          fieldName: 'from',
          currentVersion: 'now-5m',
          targetVersion: 'now-15m',
        },
      ]);
    });

    it('returns full diff when current to is not now', () => {
      const result = getFieldDiffsForRuleSchedule({
        current_version: {
          interval: '10m',
          from: 'now-15m',
          to: 'now-2m',
        },
        target_version: {
          interval: '11m',
          from: 'now-15m',
          to: 'now',
        },
      } as ThreeWayDiff<RuleSchedule>);

      expect(result).toEqual([
        {
          fieldName: 'interval',
          currentVersion: '10m',
          targetVersion: '11m',
        },
        {
          fieldName: 'to',
          currentVersion: 'now-2m',
          targetVersion: 'now',
        },
      ]);
    });

    it('returns full diff when target lookback is negative', () => {
      const result = getFieldDiffsForRuleSchedule({
        current_version: {
          interval: '10m',
          from: 'now-15m',
          to: 'now',
        },
        target_version: {
          interval: '11m',
          from: 'now-5m',
          to: 'now',
        },
      } as ThreeWayDiff<RuleSchedule>);

      expect(result).toEqual([
        {
          fieldName: 'interval',
          currentVersion: '10m',
          targetVersion: '11m',
        },
        {
          fieldName: 'from',
          currentVersion: 'now-15m',
          targetVersion: 'now-5m',
        },
      ]);
    });

    it('returns full diff when target to is not now', () => {
      const result = getFieldDiffsForRuleSchedule({
        current_version: {
          interval: '10m',
          from: 'now-15m',
          to: 'now',
        },
        target_version: {
          interval: '11m',
          from: 'now-15m',
          to: 'now-2m',
        },
      } as ThreeWayDiff<RuleSchedule>);

      expect(result).toEqual([
        {
          fieldName: 'interval',
          currentVersion: '10m',
          targetVersion: '11m',
        },
        {
          fieldName: 'to',
          currentVersion: 'now',
          targetVersion: 'now-2m',
        },
      ]);
    });

    it('returns diff with current undefined', () => {
      const result = getFieldDiffsForRuleSchedule({
        current_version: undefined,
        target_version: {
          interval: '11m',
          from: 'now-8m',
          to: 'now',
        },
      } as ThreeWayDiff<RuleSchedule | undefined>);

      expect(result).toEqual([
        {
          fieldName: 'interval',
          currentVersion: '',
          targetVersion: '11m',
        },
        {
          fieldName: 'from',
          currentVersion: '',
          targetVersion: 'now-8m',
        },
        {
          fieldName: 'to',
          currentVersion: '',
          targetVersion: 'now',
        },
      ]);
    });

    it('returns diff with target undefined', () => {
      const result = getFieldDiffsForRuleSchedule({
        current_version: {
          interval: '11m',
          from: 'now-8m',
          to: 'now',
        },
        target_version: undefined,
      } as ThreeWayDiff<RuleSchedule | undefined>);

      expect(result).toEqual([
        {
          fieldName: 'interval',
          currentVersion: '11m',
          targetVersion: '',
        },
        {
          fieldName: 'from',
          currentVersion: 'now-8m',
          targetVersion: '',
        },
        {
          fieldName: 'to',
          currentVersion: 'now',
          targetVersion: '',
        },
      ]);
    });
  });

  describe('simple rule schedule', () => {
    it('returns diff', () => {
      const result = getFieldDiffsForRuleSchedule({
        current_version: {
          interval: '10m',
          from: 'now-11m',
          to: 'now',
        },
        target_version: {
          interval: '11m',
          from: 'now-11m',
          to: 'now',
        },
      } as ThreeWayDiff<RuleSchedule>);

      expect(result).toEqual([
        {
          fieldName: 'interval',
          currentVersion: '10m',
          targetVersion: '11m',
        },
        {
          fieldName: 'lookback',
          currentVersion: '1m',
          targetVersion: '0s',
        },
      ]);
    });

    it('returns diff when current is undefined', () => {
      const result = getFieldDiffsForRuleSchedule({
        current_version: undefined,
        target_version: {
          interval: '11m',
          from: 'now-11m',
          to: 'now',
        },
      } as ThreeWayDiff<RuleSchedule | undefined>);

      expect(result).toEqual([
        {
          fieldName: 'interval',
          currentVersion: '',
          targetVersion: '11m',
        },
        {
          fieldName: 'lookback',
          currentVersion: '',
          targetVersion: '0s',
        },
      ]);
    });

    it('returns diff when target is undefined', () => {
      const result = getFieldDiffsForRuleSchedule({
        current_version: {
          interval: '10m',
          from: 'now-11m',
          to: 'now',
        },
        target_version: undefined,
      } as ThreeWayDiff<RuleSchedule | undefined>);

      expect(result).toEqual([
        {
          fieldName: 'interval',
          currentVersion: '10m',
          targetVersion: '',
        },
        {
          fieldName: 'lookback',
          currentVersion: '1m',
          targetVersion: '',
        },
      ]);
    });
  });

  describe('no diff', () => {
    it('returns empty array for equal versions', () => {
      const result = getFieldDiffsForRuleSchedule({
        current_version: {
          interval: '10m',
          from: 'now-15m',
          to: 'now',
        },
        target_version: {
          interval: '10m',
          from: 'now-15m',
          to: 'now',
        },
      } as ThreeWayDiff<RuleSchedule>);

      expect(result).toEqual([]);
    });

    it('returns empty array for undefined versions', () => {
      const result = getFieldDiffsForRuleSchedule({
        current_version: undefined,
        target_version: undefined,
      } as ThreeWayDiff<RuleSchedule | undefined>);

      expect(result).toEqual([]);
    });
  });
});
