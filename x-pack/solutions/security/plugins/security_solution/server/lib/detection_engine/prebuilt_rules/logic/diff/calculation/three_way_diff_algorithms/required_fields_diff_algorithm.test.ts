/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  RequiredField,
  RequiredFieldArray,
  ThreeVersionsOf,
} from '../../../../../../../../common/api/detection_engine';
import {
  ThreeWayDiffOutcome,
  ThreeWayMergeOutcome,
  MissingVersion,
  ThreeWayDiffConflict,
} from '../../../../../../../../common/api/detection_engine';
import { requiredFieldsDiffAlgorithm } from './required_fields_diff_algorithm';

describe('requiredFieldsDiffAlgorithm', () => {
  describe('base cases', () => {
    it('returns current_version as merged output if there is no update - scenario AAA', () => {
      const mockVersions: ThreeVersionsOf<RequiredFieldArray> = {
        base_version: [field('one'), field('two')],
        current_version: [field('one'), field('two')],
        target_version: [field('one'), field('two')],
      };

      const result = requiredFieldsDiffAlgorithm(mockVersions, false);

      expect(result).toEqual(
        expect.objectContaining({
          merged_version: mockVersions.current_version,
          diff_outcome: ThreeWayDiffOutcome.StockValueNoUpdate,
          merge_outcome: ThreeWayMergeOutcome.Current,
          conflict: ThreeWayDiffConflict.NONE,
          has_update: false,
        })
      );
    });

    it('returns current_version as merged output if current_version is different and there is no update - scenario ABA', () => {
      const mockVersions: ThreeVersionsOf<RequiredFieldArray> = {
        base_version: [field('one'), field('two')],
        current_version: [field('one'), field('three')],
        target_version: [field('one'), field('two')],
      };

      const result = requiredFieldsDiffAlgorithm(mockVersions, true);

      expect(result).toEqual(
        expect.objectContaining({
          merged_version: mockVersions.current_version,
          diff_outcome: ThreeWayDiffOutcome.CustomizedValueNoUpdate,
          merge_outcome: ThreeWayMergeOutcome.Current,
          conflict: ThreeWayDiffConflict.NONE,
          has_update: false,
        })
      );
    });

    it('returns target_version as merged output if current_version is the same and there is an update - scenario AAB', () => {
      const mockVersions: ThreeVersionsOf<RequiredFieldArray> = {
        base_version: [field('one'), field('two')],
        current_version: [field('one'), field('two')],
        target_version: [field('one'), field('three')],
      };

      const result = requiredFieldsDiffAlgorithm(mockVersions, false);

      expect(result).toEqual(
        expect.objectContaining({
          merged_version: mockVersions.target_version,
          diff_outcome: ThreeWayDiffOutcome.StockValueCanUpdate,
          merge_outcome: ThreeWayMergeOutcome.Target,
          conflict: ThreeWayDiffConflict.NONE,
          has_update: true,
        })
      );
    });

    it('returns current_version as merged output if current version is different but it matches the update - scenario ABB', () => {
      const mockVersions: ThreeVersionsOf<RequiredFieldArray> = {
        base_version: [field('one'), field('two')],
        current_version: [field('one'), field('three')],
        target_version: [field('three'), field('one')],
      };

      const result = requiredFieldsDiffAlgorithm(mockVersions, true);

      expect(result).toEqual(
        expect.objectContaining({
          merged_version: mockVersions.current_version,
          diff_outcome: ThreeWayDiffOutcome.CustomizedValueSameUpdate,
          merge_outcome: ThreeWayMergeOutcome.Current,
          conflict: ThreeWayDiffConflict.NONE,
          has_update: false,
        })
      );
    });

    it('returns target_version as merged output with a solvable conflict if all versions are different - scenario ABC', () => {
      const mockVersions: ThreeVersionsOf<RequiredFieldArray> = {
        base_version: [field('one'), field('two')],
        current_version: [field('one'), field('three')],
        target_version: [field('one'), field('four'), field('four')],
      };

      const result = requiredFieldsDiffAlgorithm(mockVersions, true);

      expect(result).toEqual(
        expect.objectContaining({
          merged_version: [field('one'), field('four')],
          diff_outcome: ThreeWayDiffOutcome.CustomizedValueCanUpdate,
          merge_outcome: ThreeWayMergeOutcome.Target,
          conflict: ThreeWayDiffConflict.SOLVABLE,
          has_update: true,
        })
      );
    });

    describe('if base_version is missing', () => {
      it('returns target_version as merged output if current_version and target_version are the same - scenario -AA', () => {
        const mockVersions: ThreeVersionsOf<RequiredFieldArray> = {
          base_version: MissingVersion,
          current_version: [field('one'), field('two')],
          target_version: [field('two'), field('one')],
        };

        const result = requiredFieldsDiffAlgorithm(mockVersions, false);

        expect(result).toEqual(
          expect.objectContaining({
            has_base_version: false,
            base_version: undefined,
            merged_version: mockVersions.target_version,
            diff_outcome: ThreeWayDiffOutcome.MissingBaseNoUpdate,
            merge_outcome: ThreeWayMergeOutcome.Target,
            conflict: ThreeWayDiffConflict.NONE,
            has_update: false,
          })
        );
      });

      it('returns target_version as merged output without a conflict if the rule is not customized - scenario -AB', () => {
        const mockVersions: ThreeVersionsOf<RequiredFieldArray> = {
          base_version: MissingVersion,
          current_version: [field('one'), field('two')],
          target_version: [field('one'), field('three')],
        };

        const result = requiredFieldsDiffAlgorithm(mockVersions, false);

        expect(result).toEqual(
          expect.objectContaining({
            has_base_version: false,
            merged_version: mockVersions.target_version,
            diff_outcome: ThreeWayDiffOutcome.MissingBaseCanUpdate,
            merge_outcome: ThreeWayMergeOutcome.Target,
            conflict: ThreeWayDiffConflict.NONE,
            has_update: true,
          })
        );
      });

      it('returns target_version as merged output with a solvable conflict if the rule is customized - scenario -AB', () => {
        const mockVersions: ThreeVersionsOf<RequiredFieldArray> = {
          base_version: MissingVersion,
          current_version: [field('one'), field('two')],
          target_version: [field('one'), field('three')],
        };

        const result = requiredFieldsDiffAlgorithm(mockVersions, true);

        expect(result).toEqual(
          expect.objectContaining({
            has_base_version: false,
            merged_version: mockVersions.target_version,
            diff_outcome: ThreeWayDiffOutcome.MissingBaseCanUpdate,
            merge_outcome: ThreeWayMergeOutcome.Target,
            conflict: ThreeWayDiffConflict.SOLVABLE,
            has_update: true,
          })
        );
      });
    });
  });

  describe('never returns a non-solvable conflict', () => {
    const A = [field('one')];
    const B = [field('two')];
    const C = [field('three')];

    it.each([
      ['AAA', A, A, A],
      ['ABA', A, B, A],
      ['AAB', A, A, B],
      ['ABB', A, B, B],
      ['ABC', A, B, C],
      ['-AA', MissingVersion, A, A],
      ['-AB', MissingVersion, A, B],
    ] as const)('scenario %s', (_, baseVersion, currentVersion, targetVersion) => {
      for (const isRuleCustomized of [true, false]) {
        const result = requiredFieldsDiffAlgorithm(
          {
            base_version: baseVersion,
            current_version: currentVersion,
            target_version: targetVersion,
          },
          isRuleCustomized
        );

        expect(result.conflict).not.toBe(ThreeWayDiffConflict.NON_SOLVABLE);
      }
    });
  });

  describe('edge cases', () => {
    it('treats versions differing only in order as equal', () => {
      const mockVersions: ThreeVersionsOf<RequiredFieldArray> = {
        base_version: [field('one'), field('two')],
        current_version: [field('two'), field('one')],
        target_version: [field('one'), field('two')],
      };

      const result = requiredFieldsDiffAlgorithm(mockVersions, false);

      expect(result).toEqual(
        expect.objectContaining({
          merged_version: mockVersions.current_version,
          diff_outcome: ThreeWayDiffOutcome.StockValueNoUpdate,
          merge_outcome: ThreeWayMergeOutcome.Current,
          conflict: ThreeWayDiffConflict.NONE,
          has_update: false,
        })
      );
    });

    it('treats versions differing only in "ecs" as equal', () => {
      const mockVersions: ThreeVersionsOf<RequiredFieldArray> = {
        base_version: [field('one', true), field('two', false)],
        current_version: [field('one', false), field('two', true)],
        target_version: [field('one', true), field('three', true)],
      };

      const result = requiredFieldsDiffAlgorithm(mockVersions, false);

      expect(result).toEqual(
        expect.objectContaining({
          merged_version: mockVersions.target_version,
          diff_outcome: ThreeWayDiffOutcome.StockValueCanUpdate,
          merge_outcome: ThreeWayMergeOutcome.Target,
          conflict: ThreeWayDiffConflict.NONE,
          has_update: true,
        })
      );
    });

    it('treats fields with the same name and a different type as different', () => {
      const mockVersions: ThreeVersionsOf<RequiredFieldArray> = {
        base_version: [field('one')],
        current_version: [field('one')],
        target_version: [{ name: 'one', type: 'text', ecs: false }],
      };

      const result = requiredFieldsDiffAlgorithm(mockVersions, false);

      expect(result).toEqual(
        expect.objectContaining({
          diff_outcome: ThreeWayDiffOutcome.StockValueCanUpdate,
          has_update: true,
        })
      );
    });

    it('deduplicates the merged version', () => {
      const mockVersions: ThreeVersionsOf<RequiredFieldArray> = {
        base_version: [field('one')],
        current_version: [field('one'), field('one')],
        target_version: [field('one')],
      };

      const result = requiredFieldsDiffAlgorithm(mockVersions, false);

      expect(result).toEqual(
        expect.objectContaining({
          merged_version: [field('one')],
          diff_outcome: ThreeWayDiffOutcome.StockValueNoUpdate,
          merge_outcome: ThreeWayMergeOutcome.Current,
          conflict: ThreeWayDiffConflict.NONE,
        })
      );
    });

    it('handles empty arrays', () => {
      const mockVersions: ThreeVersionsOf<RequiredFieldArray> = {
        base_version: [],
        current_version: [],
        target_version: [field('one')],
      };

      const result = requiredFieldsDiffAlgorithm(mockVersions, false);

      expect(result).toEqual(
        expect.objectContaining({
          merged_version: [field('one')],
          diff_outcome: ThreeWayDiffOutcome.StockValueCanUpdate,
          merge_outcome: ThreeWayMergeOutcome.Target,
          conflict: ThreeWayDiffConflict.NONE,
        })
      );
    });

    it('resolves a bloated customized current version to the target version', () => {
      const bloatedFields = Array.from({ length: 1500 }, (_, i) => field(`field_${i}`, true));
      const mockVersions: ThreeVersionsOf<RequiredFieldArray> = {
        base_version: [field('field_0'), field('field_1'), field('field_2')],
        current_version: bloatedFields,
        target_version: [
          field('field_0'),
          field('field_1'),
          field('field_2'),
          field('field_3'),
          field('field_4'),
        ],
      };

      const result = requiredFieldsDiffAlgorithm(mockVersions, true);

      expect(result).toEqual(
        expect.objectContaining({
          merged_version: mockVersions.target_version,
          diff_outcome: ThreeWayDiffOutcome.CustomizedValueCanUpdate,
          merge_outcome: ThreeWayMergeOutcome.Target,
          conflict: ThreeWayDiffConflict.SOLVABLE,
          has_update: true,
        })
      );
    });
  });
});

function field(name: string, ecs = false): RequiredField {
  return { name, type: 'keyword', ecs };
}
