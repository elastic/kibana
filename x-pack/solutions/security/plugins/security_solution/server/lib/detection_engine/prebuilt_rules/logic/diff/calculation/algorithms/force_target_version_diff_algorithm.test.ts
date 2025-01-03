/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ThreeVersionsOf } from '../../../../../../../../common/api/detection_engine';
import {
  ThreeWayMergeOutcome,
  MissingVersion,
  ThreeWayDiffConflict,
} from '../../../../../../../../common/api/detection_engine';
import { forceTargetVersionDiffAlgorithm } from './force_target_version_diff_algorithm';

describe('forceTargetVersionDiffAlgorithm', () => {
  describe('when base version exists', () => {
    it('returns a NON conflict diff', () => {
      const mockVersions: ThreeVersionsOf<number> = {
        base_version: 1,
        current_version: 1,
        target_version: 2,
      };

      const result = forceTargetVersionDiffAlgorithm(mockVersions);

      expect(result).toMatchObject({
        conflict: ThreeWayDiffConflict.NONE,
      });
    });

    it('return merge outcome TARGET', () => {
      const mockVersions: ThreeVersionsOf<number> = {
        base_version: 1,
        current_version: 1,
        target_version: 2,
      };

      const result = forceTargetVersionDiffAlgorithm(mockVersions);

      expect(result).toMatchObject({
        has_base_version: true,
        merge_outcome: ThreeWayMergeOutcome.Target,
      });
    });
  });

  describe('when base version missing', () => {
    it('returns a NON conflict diff', () => {
      const mockVersions: ThreeVersionsOf<number> = {
        base_version: MissingVersion,
        current_version: 1,
        target_version: 2,
      };

      const result = forceTargetVersionDiffAlgorithm(mockVersions);

      expect(result).toMatchObject({
        conflict: ThreeWayDiffConflict.NONE,
      });
    });

    it('return merge outcome TARGET', () => {
      const mockVersions: ThreeVersionsOf<number> = {
        base_version: MissingVersion,
        current_version: 1,
        target_version: 2,
      };

      const result = forceTargetVersionDiffAlgorithm(mockVersions);

      expect(result).toMatchObject({
        has_base_version: false,
        merge_outcome: ThreeWayMergeOutcome.Target,
      });
    });
  });
});
