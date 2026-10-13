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
        target_version: [field('one'), field('three')],
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
        target_version: [field('four'), field('one')],
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

    describe('if base_version is missing', () => {
      it('returns target_version as merged output if current_version and target_version are the same - scenario -AA', () => {
        const mockVersions: ThreeVersionsOf<RequiredFieldArray> = {
          base_version: MissingVersion,
          current_version: [field('one'), field('two')],
          target_version: [field('one'), field('two')],
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

  describe('edge cases', () => {
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
  });
});

function field(name: string, ecs = false): RequiredField {
  return { name, type: 'keyword', ecs };
}
