/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ThreeVersionsOf } from '../../../../../../../../common/api/detection_engine';
import {
  ThreeWayDiffOutcome,
  ThreeWayMergeOutcome,
  MissingVersion,
  ThreeWayDiffConflict,
} from '../../../../../../../../common/api/detection_engine';
import { multiLineStringDiffAlgorithm } from './multi_line_string_diff_algorithm';
import {
  TEXT_M_A,
  TEXT_M_B,
  TEXT_M_C,
  TEXT_M_MERGED,
  TEXT_XL_A,
  TEXT_XL_B,
  TEXT_XL_C,
  TEXT_XL_MERGED,
} from './multi_line_string_diff_algorithm.mock';

describe('multiLineStringDiffAlgorithm', () => {
  it('returns current_version as merged output if there is no update - scenario AAA', () => {
    const mockVersions: ThreeVersionsOf<string> = {
      base_version: TEXT_M_A,
      current_version: TEXT_M_A,
      target_version: TEXT_M_A,
    };

    const result = multiLineStringDiffAlgorithm(mockVersions);

    expect(result).toEqual(
      expect.objectContaining({
        merged_version: mockVersions.current_version,
        diff_outcome: ThreeWayDiffOutcome.StockValueNoUpdate,
        conflict: ThreeWayDiffConflict.NONE,
        merge_outcome: ThreeWayMergeOutcome.Current,
      })
    );
  });

  it('returns current_version as merged output if current_version is different and there is no update - scenario ABA', () => {
    const mockVersions: ThreeVersionsOf<string> = {
      base_version: TEXT_M_A,
      current_version: TEXT_M_B,
      target_version: TEXT_M_A,
    };

    const result = multiLineStringDiffAlgorithm(mockVersions);

    expect(result).toEqual(
      expect.objectContaining({
        merged_version: mockVersions.current_version,
        diff_outcome: ThreeWayDiffOutcome.CustomizedValueNoUpdate,
        conflict: ThreeWayDiffConflict.NONE,
        merge_outcome: ThreeWayMergeOutcome.Current,
      })
    );
  });

  it('returns target_version as merged output if current_version is the same and there is an update - scenario AAB', () => {
    const mockVersions: ThreeVersionsOf<string> = {
      base_version: TEXT_M_A,
      current_version: TEXT_M_A,
      target_version: TEXT_M_B,
    };

    const result = multiLineStringDiffAlgorithm(mockVersions);

    expect(result).toEqual(
      expect.objectContaining({
        merged_version: mockVersions.target_version,
        diff_outcome: ThreeWayDiffOutcome.StockValueCanUpdate,
        conflict: ThreeWayDiffConflict.NONE,
        merge_outcome: ThreeWayMergeOutcome.Target,
      })
    );
  });

  it('returns current_version as merged output if current version is different but it matches the update - scenario ABB', () => {
    const mockVersions: ThreeVersionsOf<string> = {
      base_version: TEXT_M_A,
      current_version: TEXT_M_B,
      target_version: TEXT_M_B,
    };

    const result = multiLineStringDiffAlgorithm(mockVersions);

    expect(result).toEqual(
      expect.objectContaining({
        merged_version: mockVersions.current_version,
        diff_outcome: ThreeWayDiffOutcome.CustomizedValueSameUpdate,
        conflict: ThreeWayDiffConflict.NONE,
        merge_outcome: ThreeWayMergeOutcome.Current,
      })
    );
  });

  describe('if all three versions are different - scenario ABC', () => {
    it('returns a computated merged version with a solvable conflict if 3 way merge is possible (real-world example)', () => {
      const mockVersions: ThreeVersionsOf<string> = {
        base_version: TEXT_M_A,
        current_version: TEXT_M_B,
        target_version: TEXT_M_C,
      };

      const result = multiLineStringDiffAlgorithm(mockVersions);

      expect(result).toEqual(
        expect.objectContaining({
          merged_version: TEXT_M_MERGED,
          diff_outcome: ThreeWayDiffOutcome.CustomizedValueCanUpdate,
          conflict: ThreeWayDiffConflict.SOLVABLE,
          merge_outcome: ThreeWayMergeOutcome.Merged,
        })
      );
    });

    it('returns a computated merged version with a solvable conflict if 3 way merge is possible (simplified example)', () => {
      // 3 way merge is possible when changes are made to different lines of text
      // (in other words, there are no different changes made to the same line of text).
      const mockVersions: ThreeVersionsOf<string> = {
        base_version: 'My description.\nThis is a second line.',
        current_version: 'My MODIFIED description.\nThis is a second line.',
        target_version: 'My description.\nThis is a MODIFIED second line.',
      };

      const result = multiLineStringDiffAlgorithm(mockVersions);

      expect(result).toEqual(
        expect.objectContaining({
          merged_version: 'My MODIFIED description.\nThis is a MODIFIED second line.',
          diff_outcome: ThreeWayDiffOutcome.CustomizedValueCanUpdate,
          conflict: ThreeWayDiffConflict.SOLVABLE,
          merge_outcome: ThreeWayMergeOutcome.Merged,
        })
      );
    });

    it('returns the current_version with a non-solvable conflict if 3 way merge is not possible (simplified example)', () => {
      // It's enough to have different changes made to the same line of text
      // to trigger a NON_SOLVABLE conflict. This behavior is similar to how Git works.
      const mockVersions: ThreeVersionsOf<string> = {
        base_version: 'My description.\nThis is a second line.',
        current_version: 'My GREAT description.\nThis is a second line.',
        target_version: 'My EXCELLENT description.\nThis is a second line.',
      };

      const result = multiLineStringDiffAlgorithm(mockVersions);

      expect(result).toEqual(
        expect.objectContaining({
          merged_version: mockVersions.current_version,
          diff_outcome: ThreeWayDiffOutcome.CustomizedValueCanUpdate,
          conflict: ThreeWayDiffConflict.NON_SOLVABLE,
          merge_outcome: ThreeWayMergeOutcome.Current,
        })
      );
    });

    it('does not exceed performance limits when diffing and merging extra large input texts', () => {
      const mockVersions: ThreeVersionsOf<string> = {
        base_version: TEXT_XL_A,
        current_version: TEXT_XL_B,
        target_version: TEXT_XL_C,
      };

      const startTime = performance.now();
      const result = multiLineStringDiffAlgorithm(mockVersions);
      const endTime = performance.now();

      // If the regex merge in this function takes over 1 sec, this test fails
      // Performance measurements: https://github.com/elastic/kibana/pull/199388
      // NOTE: despite the fact that this test runs in ~50ms locally, on CI it
      // runs slower and can be flaky even with a 500ms threshold.
      expect(endTime - startTime).toBeLessThan(1000);

      expect(result).toEqual(
        expect.objectContaining({
          merged_version: TEXT_XL_MERGED,
          diff_outcome: ThreeWayDiffOutcome.CustomizedValueCanUpdate,
          conflict: ThreeWayDiffConflict.SOLVABLE,
          merge_outcome: ThreeWayMergeOutcome.Merged,
        })
      );
    });
  });

  describe('if base_version is missing', () => {
    it('returns current_version as merged output if current_version and target_version are the same - scenario -AA', () => {
      const mockVersions: ThreeVersionsOf<string> = {
        base_version: MissingVersion,
        current_version: TEXT_M_A,
        target_version: TEXT_M_A,
      };

      const result = multiLineStringDiffAlgorithm(mockVersions);

      expect(result).toEqual(
        expect.objectContaining({
          has_base_version: false,
          base_version: undefined,
          merged_version: mockVersions.current_version,
          diff_outcome: ThreeWayDiffOutcome.MissingBaseNoUpdate,
          merge_outcome: ThreeWayMergeOutcome.Current,
          conflict: ThreeWayDiffConflict.NONE,
        })
      );
    });

    it('returns target_version as merged output if current_version and target_version are different - scenario -AB', () => {
      const mockVersions: ThreeVersionsOf<string> = {
        base_version: MissingVersion,
        current_version: TEXT_M_A,
        target_version: TEXT_M_B,
      };

      const result = multiLineStringDiffAlgorithm(mockVersions);

      expect(result).toEqual(
        expect.objectContaining({
          has_base_version: false,
          base_version: undefined,
          merged_version: mockVersions.target_version,
          diff_outcome: ThreeWayDiffOutcome.MissingBaseCanUpdate,
          merge_outcome: ThreeWayMergeOutcome.Target,
          conflict: ThreeWayDiffConflict.SOLVABLE,
        })
      );
    });
  });
});
