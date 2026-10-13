/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleSchedule } from '../../../../../../../../common/api/detection_engine/model/rule_schema/rule_schedule';
import {
  MissingVersion,
  ThreeWayDiffConflict,
  ThreeWayDiffOutcome,
  ThreeWayMergeOutcome,
} from '../../../../../../../../common/api/detection_engine';
import { ruleScheduleDiffAlgorithm } from './rule_schedule_diff_algorithm';

describe('ruleScheduleDiffAlgorithm', () => {
  const stock: RuleSchedule = { interval: '60m', from: 'now-24h', to: 'now' };
  const stockNormalized: RuleSchedule = { interval: '1h', from: 'now-1d', to: 'now' };
  const changed: RuleSchedule = { interval: '30m', from: 'now-1h', to: 'now' };

  it('treats equal durations in different units as the same value and uses the target value for untouched properties', () => {
    const result = ruleScheduleDiffAlgorithm(
      { base_version: stock, current_version: stockNormalized, target_version: stock },
      false
    );

    expect(result).toEqual(
      expect.objectContaining({
        diff_outcome: ThreeWayDiffOutcome.StockValueNoUpdate,
        merged_version: stock,
        merge_outcome: ThreeWayMergeOutcome.Current,
        conflict: ThreeWayDiffConflict.NONE,
        has_update: false,
      })
    );
  });

  it('keeps the customized property and uses the target value for untouched properties', () => {
    const customized: RuleSchedule = { interval: '2h', from: 'now-24h', to: 'now' };
    const result = ruleScheduleDiffAlgorithm(
      { base_version: stock, current_version: customized, target_version: stockNormalized },
      true
    );

    expect(result).toEqual(
      expect.objectContaining({
        diff_outcome: ThreeWayDiffOutcome.CustomizedValueNoUpdate,
        merged_version: { interval: '2h', from: 'now-1d', to: 'now' },
        conflict: ThreeWayDiffConflict.NONE,
      })
    );
  });

  it('never mixes current and target values between from and to', () => {
    const result = ruleScheduleDiffAlgorithm(
      {
        base_version: stock,
        current_version: { interval: '60m', from: 'now-48h', to: 'now' },
        target_version: { interval: '60m', from: 'now-1d', to: 'now-1m' },
      },
      true
    );

    expect(result.merged_version).toEqual({ interval: '60m', from: 'now-48h', to: 'now' });
  });

  it('uses the target value when it changed and the rule is not customized', () => {
    const result = ruleScheduleDiffAlgorithm(
      { base_version: stock, current_version: stockNormalized, target_version: changed },
      false
    );

    expect(result).toEqual(
      expect.objectContaining({
        diff_outcome: ThreeWayDiffOutcome.StockValueCanUpdate,
        merged_version: changed,
        merge_outcome: ThreeWayMergeOutcome.Target,
        conflict: ThreeWayDiffConflict.NONE,
        has_update: true,
      })
    );
  });

  it('preserves the current value and reports a conflict when customized and target changed', () => {
    const customized: RuleSchedule = { interval: '120m', from: 'now-24h', to: 'now' };
    const result = ruleScheduleDiffAlgorithm(
      { base_version: stock, current_version: customized, target_version: changed },
      true
    );

    expect(result).toEqual(
      expect.objectContaining({
        diff_outcome: ThreeWayDiffOutcome.CustomizedValueCanUpdate,
        merged_version: customized,
        merge_outcome: ThreeWayMergeOutcome.Current,
        conflict: ThreeWayDiffConflict.NON_SOLVABLE,
      })
    );
  });

  it('uses the target value when the base version is missing', () => {
    const result = ruleScheduleDiffAlgorithm(
      { base_version: MissingVersion, current_version: stockNormalized, target_version: stock },
      false
    );

    expect(result).toEqual(
      expect.objectContaining({
        diff_outcome: ThreeWayDiffOutcome.MissingBaseNoUpdate,
        merged_version: stock,
        merge_outcome: ThreeWayMergeOutcome.Target,
        conflict: ThreeWayDiffConflict.NONE,
      })
    );
  });

  it('returns a solvable conflict with the target value when the base version is missing and the rule is customized', () => {
    const result = ruleScheduleDiffAlgorithm(
      { base_version: MissingVersion, current_version: stock, target_version: changed },
      true
    );

    expect(result).toEqual(
      expect.objectContaining({
        diff_outcome: ThreeWayDiffOutcome.MissingBaseCanUpdate,
        merged_version: changed,
        merge_outcome: ThreeWayMergeOutcome.Target,
        conflict: ThreeWayDiffConflict.SOLVABLE,
      })
    );
  });
});
