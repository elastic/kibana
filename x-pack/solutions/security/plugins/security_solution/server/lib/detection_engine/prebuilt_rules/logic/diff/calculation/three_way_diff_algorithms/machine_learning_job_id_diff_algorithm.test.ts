/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  MachineLearningJobId,
  ThreeVersionsOf,
} from '../../../../../../../../common/api/detection_engine';
import {
  MissingVersion,
  ThreeWayDiffConflict,
  ThreeWayDiffOutcome,
  ThreeWayMergeOutcome,
} from '../../../../../../../../common/api/detection_engine';
import { machineLearningJobIdDiffAlgorithm } from './machine_learning_job_id_diff_algorithm';

const AFFECTED_JOB_ID = 'v2_windows_rare_metadata_user';
const ANOTHER_AFFECTED_JOB_ID = 'v2_linux_rare_metadata_user';
const REPLACEMENT_JOB_ID = 'v3_windows_rare_metadata_user_ea';
const UNAFFECTED_JOB_ID = 'high_count_network_denies';
const CUSTOM_JOB_ID = 'custom_job';

describe('machineLearningJobIdDiffAlgorithm', () => {
  describe('when the change does not alter the set of referenced jobs (cosmetic)', () => {
    // `machine_learning_job_id` denotes an unordered set of jobs, so a change that only reorders,
    // de-duplicates, or reshapes (string vs single-element array) the same set is not a real update:
    // no update available, no conflict, and the current value is kept as-is.

    it('treats a reordering of the same jobs as no change', () => {
      const mockVersions: ThreeVersionsOf<MachineLearningJobId> = {
        base_version: [AFFECTED_JOB_ID, UNAFFECTED_JOB_ID],
        current_version: [AFFECTED_JOB_ID, UNAFFECTED_JOB_ID],
        target_version: [UNAFFECTED_JOB_ID, AFFECTED_JOB_ID],
      };

      const result = machineLearningJobIdDiffAlgorithm(mockVersions, false);

      expect(result).toEqual(
        expect.objectContaining({
          has_update: false,
          merged_version: [AFFECTED_JOB_ID, UNAFFECTED_JOB_ID],
          merge_outcome: ThreeWayMergeOutcome.Current,
          conflict: ThreeWayDiffConflict.NONE,
          diff_outcome: ThreeWayDiffOutcome.StockValueNoUpdate,
        })
      );
    });

    it('treats de-duplication of the same job as no change', () => {
      const mockVersions: ThreeVersionsOf<MachineLearningJobId> = {
        base_version: [AFFECTED_JOB_ID, AFFECTED_JOB_ID],
        current_version: [AFFECTED_JOB_ID, AFFECTED_JOB_ID],
        target_version: [AFFECTED_JOB_ID],
      };

      const result = machineLearningJobIdDiffAlgorithm(mockVersions, false);

      expect(result).toEqual(
        expect.objectContaining({
          has_update: false,
          merged_version: [AFFECTED_JOB_ID, AFFECTED_JOB_ID],
          merge_outcome: ThreeWayMergeOutcome.Current,
          conflict: ThreeWayDiffConflict.NONE,
          diff_outcome: ThreeWayDiffOutcome.StockValueNoUpdate,
        })
      );
    });

    it('treats a string-to-array representation change of the same job as no change', () => {
      const mockVersions: ThreeVersionsOf<MachineLearningJobId> = {
        base_version: AFFECTED_JOB_ID,
        current_version: AFFECTED_JOB_ID,
        target_version: [AFFECTED_JOB_ID],
      };

      const result = machineLearningJobIdDiffAlgorithm(mockVersions, false);

      expect(result).toEqual(
        expect.objectContaining({
          has_update: false,
          merged_version: AFFECTED_JOB_ID,
          merge_outcome: ThreeWayMergeOutcome.Current,
          conflict: ThreeWayDiffConflict.NONE,
          diff_outcome: ThreeWayDiffOutcome.StockValueNoUpdate,
        })
      );
    });
  });

  describe('when no legacy ("affected") ML job is involved', () => {
    it('applies the target for a plain stock update of a non-affected job', () => {
      const mockVersions: ThreeVersionsOf<MachineLearningJobId> = {
        base_version: UNAFFECTED_JOB_ID,
        current_version: UNAFFECTED_JOB_ID,
        target_version: REPLACEMENT_JOB_ID,
      };

      const result = machineLearningJobIdDiffAlgorithm(mockVersions, false);

      expect(result).toEqual(
        expect.objectContaining({
          has_update: true,
          merged_version: REPLACEMENT_JOB_ID,
          merge_outcome: ThreeWayMergeOutcome.Target,
          conflict: ThreeWayDiffConflict.NONE,
          diff_outcome: ThreeWayDiffOutcome.StockValueCanUpdate,
        })
      );
    });

    it('reports no update when a scalar value is unchanged', () => {
      const mockVersions: ThreeVersionsOf<MachineLearningJobId> = {
        base_version: UNAFFECTED_JOB_ID,
        current_version: UNAFFECTED_JOB_ID,
        target_version: UNAFFECTED_JOB_ID,
      };

      const result = machineLearningJobIdDiffAlgorithm(mockVersions, false);

      expect(result).toEqual(
        expect.objectContaining({
          has_update: false,
          merged_version: UNAFFECTED_JOB_ID,
          merge_outcome: ThreeWayMergeOutcome.Current,
          conflict: ThreeWayDiffConflict.NONE,
          diff_outcome: ThreeWayDiffOutcome.StockValueNoUpdate,
        })
      );
    });

    it('reports no update when an array value is unchanged', () => {
      const mockVersions: ThreeVersionsOf<MachineLearningJobId> = {
        base_version: [CUSTOM_JOB_ID, UNAFFECTED_JOB_ID],
        current_version: [CUSTOM_JOB_ID, UNAFFECTED_JOB_ID],
        target_version: [CUSTOM_JOB_ID, UNAFFECTED_JOB_ID],
      };

      const result = machineLearningJobIdDiffAlgorithm(mockVersions, false);

      expect(result).toEqual(
        expect.objectContaining({
          has_update: false,
          merged_version: [CUSTOM_JOB_ID, UNAFFECTED_JOB_ID],
          merge_outcome: ThreeWayMergeOutcome.Current,
          conflict: ThreeWayDiffConflict.NONE,
          diff_outcome: ThreeWayDiffOutcome.StockValueNoUpdate,
        })
      );
    });

    it('surfaces a customization conflict as NON_SOLVABLE', () => {
      const mockVersions: ThreeVersionsOf<MachineLearningJobId> = {
        base_version: UNAFFECTED_JOB_ID,
        current_version: CUSTOM_JOB_ID,
        target_version: REPLACEMENT_JOB_ID,
      };

      const result = machineLearningJobIdDiffAlgorithm(mockVersions, true);

      expect(result).toEqual(
        expect.objectContaining({
          merged_version: CUSTOM_JOB_ID,
          merge_outcome: ThreeWayMergeOutcome.Current,
          conflict: ThreeWayDiffConflict.NON_SOLVABLE,
          diff_outcome: ThreeWayDiffOutcome.CustomizedValueCanUpdate,
        })
      );
    });
  });

  describe('when upgrading keeps every legacy ("affected") ML job', () => {
    it('reports no update when a single affected job is unchanged', () => {
      const mockVersions: ThreeVersionsOf<MachineLearningJobId> = {
        base_version: AFFECTED_JOB_ID,
        current_version: AFFECTED_JOB_ID,
        target_version: AFFECTED_JOB_ID,
      };

      const result = machineLearningJobIdDiffAlgorithm(mockVersions, false);

      expect(result).toEqual(
        expect.objectContaining({
          has_update: false,
          merged_version: AFFECTED_JOB_ID,
          merge_outcome: ThreeWayMergeOutcome.Current,
          conflict: ThreeWayDiffConflict.NONE,
          diff_outcome: ThreeWayDiffOutcome.StockValueNoUpdate,
        })
      );
    });

    it('reports no update when an array containing affected job is unchanged', () => {
      const mockVersions: ThreeVersionsOf<MachineLearningJobId> = {
        base_version: [AFFECTED_JOB_ID, UNAFFECTED_JOB_ID],
        current_version: [AFFECTED_JOB_ID, UNAFFECTED_JOB_ID],
        target_version: [AFFECTED_JOB_ID, UNAFFECTED_JOB_ID],
      };

      const result = machineLearningJobIdDiffAlgorithm(mockVersions, false);

      expect(result).toEqual(
        expect.objectContaining({
          has_update: false,
          merged_version: [AFFECTED_JOB_ID, UNAFFECTED_JOB_ID],
          merge_outcome: ThreeWayMergeOutcome.Current,
          conflict: ThreeWayDiffConflict.NONE,
          diff_outcome: ThreeWayDiffOutcome.StockValueNoUpdate,
        })
      );
    });

    it('applies the target for a stock update that adds a job alongside the affected one', () => {
      const mockVersions: ThreeVersionsOf<MachineLearningJobId> = {
        base_version: AFFECTED_JOB_ID,
        current_version: AFFECTED_JOB_ID,
        target_version: [AFFECTED_JOB_ID, REPLACEMENT_JOB_ID],
      };

      const result = machineLearningJobIdDiffAlgorithm(mockVersions, false);

      expect(result).toEqual(
        expect.objectContaining({
          merged_version: [AFFECTED_JOB_ID, REPLACEMENT_JOB_ID],
          merge_outcome: ThreeWayMergeOutcome.Target,
          conflict: ThreeWayDiffConflict.NONE,
          diff_outcome: ThreeWayDiffOutcome.StockValueCanUpdate,
        })
      );
    });

    it('does not flag when the target introduces an affected job the current value lacks', () => {
      // The check only cares about affected jobs the *current* value references being dropped, not
      // about the target adding one.
      const mockVersions: ThreeVersionsOf<MachineLearningJobId> = {
        base_version: UNAFFECTED_JOB_ID,
        current_version: UNAFFECTED_JOB_ID,
        target_version: [UNAFFECTED_JOB_ID, AFFECTED_JOB_ID],
      };

      const result = machineLearningJobIdDiffAlgorithm(mockVersions, false);

      expect(result).toEqual(
        expect.objectContaining({
          merged_version: [UNAFFECTED_JOB_ID, AFFECTED_JOB_ID],
          merge_outcome: ThreeWayMergeOutcome.Target,
          conflict: ThreeWayDiffConflict.NONE,
          diff_outcome: ThreeWayDiffOutcome.StockValueCanUpdate,
        })
      );
    });
  });

  describe('when upgrading would drop a legacy ("affected") ML job', () => {
    it('returns a NON_SOLVABLE conflict and keeps the current job (single value)', () => {
      const mockVersions: ThreeVersionsOf<MachineLearningJobId> = {
        base_version: AFFECTED_JOB_ID,
        current_version: AFFECTED_JOB_ID,
        target_version: REPLACEMENT_JOB_ID,
      };

      const result = machineLearningJobIdDiffAlgorithm(mockVersions, false);

      expect(result).toEqual(
        expect.objectContaining({
          has_update: true,
          merged_version: AFFECTED_JOB_ID,
          merge_outcome: ThreeWayMergeOutcome.Current,
          conflict: ThreeWayDiffConflict.NON_SOLVABLE,
          diff_outcome: ThreeWayDiffOutcome.StockValueCanUpdate,
        })
      );
    });

    it('returns a NON_SOLVABLE conflict and keeps the current jobs (array)', () => {
      const mockVersions: ThreeVersionsOf<MachineLearningJobId> = {
        base_version: [AFFECTED_JOB_ID, UNAFFECTED_JOB_ID],
        current_version: [AFFECTED_JOB_ID, UNAFFECTED_JOB_ID],
        target_version: [UNAFFECTED_JOB_ID, REPLACEMENT_JOB_ID],
      };

      const result = machineLearningJobIdDiffAlgorithm(mockVersions, false);

      expect(result).toEqual(
        expect.objectContaining({
          has_update: true,
          merged_version: [AFFECTED_JOB_ID, UNAFFECTED_JOB_ID],
          merge_outcome: ThreeWayMergeOutcome.Current,
          conflict: ThreeWayDiffConflict.NON_SOLVABLE,
          diff_outcome: ThreeWayDiffOutcome.StockValueCanUpdate,
        })
      );
    });

    it('detects the drop regardless of field representation (current string, target array)', () => {
      const mockVersions: ThreeVersionsOf<MachineLearningJobId> = {
        base_version: AFFECTED_JOB_ID,
        current_version: AFFECTED_JOB_ID,
        target_version: [REPLACEMENT_JOB_ID],
      };

      const result = machineLearningJobIdDiffAlgorithm(mockVersions, false);

      expect(result).toEqual(
        expect.objectContaining({
          merged_version: AFFECTED_JOB_ID,
          merge_outcome: ThreeWayMergeOutcome.Current,
          conflict: ThreeWayDiffConflict.NON_SOLVABLE,
          diff_outcome: ThreeWayDiffOutcome.StockValueCanUpdate,
        })
      );
    });

    it('detects the drop regardless of field representation (current array, target string)', () => {
      const mockVersions: ThreeVersionsOf<MachineLearningJobId> = {
        base_version: [AFFECTED_JOB_ID],
        current_version: [AFFECTED_JOB_ID],
        target_version: REPLACEMENT_JOB_ID,
      };

      const result = machineLearningJobIdDiffAlgorithm(mockVersions, false);

      expect(result).toEqual(
        expect.objectContaining({
          merged_version: [AFFECTED_JOB_ID],
          merge_outcome: ThreeWayMergeOutcome.Current,
          conflict: ThreeWayDiffConflict.NON_SOLVABLE,
          diff_outcome: ThreeWayDiffOutcome.StockValueCanUpdate,
        })
      );
    });

    it('detects the drop even when the current value lists the affected job more than once', () => {
      const mockVersions: ThreeVersionsOf<MachineLearningJobId> = {
        base_version: [AFFECTED_JOB_ID, AFFECTED_JOB_ID],
        current_version: [AFFECTED_JOB_ID, AFFECTED_JOB_ID],
        target_version: [REPLACEMENT_JOB_ID],
      };

      const result = machineLearningJobIdDiffAlgorithm(mockVersions, false);

      expect(result).toEqual(
        expect.objectContaining({
          merged_version: [AFFECTED_JOB_ID, AFFECTED_JOB_ID],
          merge_outcome: ThreeWayMergeOutcome.Current,
          conflict: ThreeWayDiffConflict.NON_SOLVABLE,
          diff_outcome: ThreeWayDiffOutcome.StockValueCanUpdate,
        })
      );
    });

    it('returns a NON_SOLVABLE conflict when only one of several affected jobs is dropped', () => {
      const mockVersions: ThreeVersionsOf<MachineLearningJobId> = {
        base_version: [AFFECTED_JOB_ID, ANOTHER_AFFECTED_JOB_ID],
        current_version: [AFFECTED_JOB_ID, ANOTHER_AFFECTED_JOB_ID],
        // Keeps ANOTHER_AFFECTED_JOB_ID but drops AFFECTED_JOB_ID.
        target_version: [ANOTHER_AFFECTED_JOB_ID, REPLACEMENT_JOB_ID],
      };

      const result = machineLearningJobIdDiffAlgorithm(mockVersions, false);

      expect(result).toEqual(
        expect.objectContaining({
          merged_version: [AFFECTED_JOB_ID, ANOTHER_AFFECTED_JOB_ID],
          merge_outcome: ThreeWayMergeOutcome.Current,
          conflict: ThreeWayDiffConflict.NON_SOLVABLE,
          diff_outcome: ThreeWayDiffOutcome.StockValueCanUpdate,
        })
      );
    });

    it('returns a NON_SOLVABLE conflict for a customized rule whose affected job is dropped', () => {
      const mockVersions: ThreeVersionsOf<MachineLearningJobId> = {
        base_version: AFFECTED_JOB_ID,
        current_version: [AFFECTED_JOB_ID, CUSTOM_JOB_ID],
        target_version: REPLACEMENT_JOB_ID,
      };

      const result = machineLearningJobIdDiffAlgorithm(mockVersions, true);

      expect(result).toEqual(
        expect.objectContaining({
          merged_version: [AFFECTED_JOB_ID, CUSTOM_JOB_ID],
          merge_outcome: ThreeWayMergeOutcome.Current,
          conflict: ThreeWayDiffConflict.NON_SOLVABLE,
          diff_outcome: ThreeWayDiffOutcome.CustomizedValueCanUpdate,
        })
      );
    });

    it('overrides the missing-base outcome to keep the current job (stock rule)', () => {
      const mockVersions: ThreeVersionsOf<MachineLearningJobId> = {
        base_version: MissingVersion,
        current_version: [AFFECTED_JOB_ID],
        target_version: [REPLACEMENT_JOB_ID],
      };

      const result = machineLearningJobIdDiffAlgorithm(mockVersions, false);

      expect(result).toEqual(
        expect.objectContaining({
          merged_version: [AFFECTED_JOB_ID],
          merge_outcome: ThreeWayMergeOutcome.Current,
          conflict: ThreeWayDiffConflict.NON_SOLVABLE,
          diff_outcome: ThreeWayDiffOutcome.MissingBaseCanUpdate,
        })
      );
    });

    it('overrides the missing-base outcome to keep the current job (customized rule)', () => {
      const mockVersions: ThreeVersionsOf<MachineLearningJobId> = {
        base_version: MissingVersion,
        current_version: [AFFECTED_JOB_ID, CUSTOM_JOB_ID],
        target_version: [REPLACEMENT_JOB_ID],
      };

      const result = machineLearningJobIdDiffAlgorithm(mockVersions, true);

      expect(result).toEqual(
        expect.objectContaining({
          merged_version: [AFFECTED_JOB_ID, CUSTOM_JOB_ID],
          merge_outcome: ThreeWayMergeOutcome.Current,
          conflict: ThreeWayDiffConflict.NON_SOLVABLE,
          diff_outcome: ThreeWayDiffOutcome.MissingBaseCanUpdate,
        })
      );
    });
  });
});
