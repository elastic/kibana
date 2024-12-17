/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  RuleKqlQuery,
  ThreeVersionsOf,
} from '../../../../../../../../common/api/detection_engine';
import {
  ThreeWayDiffOutcome,
  ThreeWayMergeOutcome,
  MissingVersion,
  ThreeWayDiffConflict,
  KqlQueryType,
  KqlQueryLanguageEnum,
} from '../../../../../../../../common/api/detection_engine';
import { kqlQueryDiffAlgorithm } from './kql_query_diff_algorithm';

describe('kqlQueryDiffAlgorithm', () => {
  describe('returns current_version as merged output if there is no update - scenario AAA', () => {
    it('if all versions are inline query type', () => {
      const mockVersions: ThreeVersionsOf<RuleKqlQuery> = {
        base_version: {
          type: KqlQueryType.inline_query,
          query: 'query string = true',
          language: KqlQueryLanguageEnum.kuery,
          filters: [],
        },
        current_version: {
          type: KqlQueryType.inline_query,
          query: 'query string = true',
          language: KqlQueryLanguageEnum.kuery,
          filters: [],
        },
        target_version: {
          type: KqlQueryType.inline_query,
          query: 'query string = true',
          language: KqlQueryLanguageEnum.kuery,
          filters: [],
        },
      };

      const result = kqlQueryDiffAlgorithm(mockVersions);

      expect(result).toEqual(
        expect.objectContaining({
          merged_version: mockVersions.current_version,
          diff_outcome: ThreeWayDiffOutcome.StockValueNoUpdate,
          merge_outcome: ThreeWayMergeOutcome.Current,
          conflict: ThreeWayDiffConflict.NONE,
        })
      );
    });

    it('if all versions are saved query type', () => {
      const mockVersions: ThreeVersionsOf<RuleKqlQuery> = {
        base_version: {
          type: KqlQueryType.saved_query,
          saved_query_id: 'saved-query-id',
        },
        current_version: {
          type: KqlQueryType.saved_query,
          saved_query_id: 'saved-query-id',
        },
        target_version: {
          type: KqlQueryType.saved_query,
          saved_query_id: 'saved-query-id',
        },
      };

      const result = kqlQueryDiffAlgorithm(mockVersions);

      expect(result).toEqual(
        expect.objectContaining({
          merged_version: mockVersions.current_version,
          diff_outcome: ThreeWayDiffOutcome.StockValueNoUpdate,
          merge_outcome: ThreeWayMergeOutcome.Current,
          conflict: ThreeWayDiffConflict.NONE,
        })
      );
    });
  });

  describe('returns current_version as merged output if current_version is different and there is no update - scenario ABA', () => {
    it('if current version is different query type than base and target', () => {
      const mockVersions: ThreeVersionsOf<RuleKqlQuery> = {
        base_version: {
          type: KqlQueryType.saved_query,
          saved_query_id: 'saved-query-id',
        },
        current_version: {
          type: KqlQueryType.inline_query,
          query: 'query string = true',
          language: KqlQueryLanguageEnum.kuery,
          filters: [],
        },
        target_version: {
          type: KqlQueryType.saved_query,
          saved_query_id: 'saved-query-id',
        },
      };

      const result = kqlQueryDiffAlgorithm(mockVersions);

      expect(result).toEqual(
        expect.objectContaining({
          merged_version: mockVersions.current_version,
          diff_outcome: ThreeWayDiffOutcome.CustomizedValueNoUpdate,
          merge_outcome: ThreeWayMergeOutcome.Current,
          conflict: ThreeWayDiffConflict.NONE,
        })
      );
    });

    it('if all versions are same data type', () => {
      const mockVersions: ThreeVersionsOf<RuleKqlQuery> = {
        base_version: {
          type: KqlQueryType.inline_query,
          query: 'query string = true',
          language: KqlQueryLanguageEnum.kuery,
          filters: [],
        },
        current_version: {
          type: KqlQueryType.inline_query,
          query: 'query string = false',
          language: KqlQueryLanguageEnum.kuery,
          filters: [],
        },
        target_version: {
          type: KqlQueryType.inline_query,
          query: 'query string = true',
          language: KqlQueryLanguageEnum.kuery,
          filters: [],
        },
      };

      const result = kqlQueryDiffAlgorithm(mockVersions);

      expect(result).toEqual(
        expect.objectContaining({
          merged_version: mockVersions.current_version,
          diff_outcome: ThreeWayDiffOutcome.CustomizedValueNoUpdate,
          merge_outcome: ThreeWayMergeOutcome.Current,
          conflict: ThreeWayDiffConflict.NONE,
        })
      );
    });
  });

  describe('returns target_version as merged output if current_version is the same and there is an update - scenario AAB', () => {
    it('if target version is different query type than base and current', () => {
      const mockVersions: ThreeVersionsOf<RuleKqlQuery> = {
        base_version: {
          type: KqlQueryType.inline_query,
          query: 'query string = true',
          language: KqlQueryLanguageEnum.kuery,
          filters: [],
        },
        current_version: {
          type: KqlQueryType.inline_query,
          query: 'query string = true',
          language: KqlQueryLanguageEnum.kuery,
          filters: [],
        },
        target_version: {
          type: KqlQueryType.saved_query,
          saved_query_id: 'saved-query-id',
        },
      };

      const result = kqlQueryDiffAlgorithm(mockVersions);

      expect(result).toEqual(
        expect.objectContaining({
          merged_version: mockVersions.target_version,
          diff_outcome: ThreeWayDiffOutcome.StockValueCanUpdate,
          merge_outcome: ThreeWayMergeOutcome.Target,
          conflict: ThreeWayDiffConflict.NONE,
        })
      );
    });

    it('if all versions are same data type', () => {
      const mockVersions: ThreeVersionsOf<RuleKqlQuery> = {
        base_version: {
          type: KqlQueryType.inline_query,
          query: 'query string = true',
          language: KqlQueryLanguageEnum.kuery,
          filters: [],
        },
        current_version: {
          type: KqlQueryType.inline_query,
          query: 'query string = true',
          language: KqlQueryLanguageEnum.kuery,
          filters: [],
        },
        target_version: {
          type: KqlQueryType.inline_query,
          query: 'query string = true',
          language: KqlQueryLanguageEnum.kuery,
          filters: [{ field: 'some filter' }],
        },
      };

      const result = kqlQueryDiffAlgorithm(mockVersions);

      expect(result).toEqual(
        expect.objectContaining({
          merged_version: mockVersions.target_version,
          diff_outcome: ThreeWayDiffOutcome.StockValueCanUpdate,
          merge_outcome: ThreeWayMergeOutcome.Target,
          conflict: ThreeWayDiffConflict.NONE,
        })
      );
    });
  });

  describe('returns current_version as merged output if current version is different but it matches the update - scenario ABB', () => {
    it('if base version is different query type from current and target versions', () => {
      const mockVersions: ThreeVersionsOf<RuleKqlQuery> = {
        base_version: {
          type: KqlQueryType.inline_query,
          query: 'query string = true',
          language: KqlQueryLanguageEnum.kuery,
          filters: [],
        },
        current_version: {
          type: KqlQueryType.saved_query,
          saved_query_id: 'saved-query-id',
        },
        target_version: {
          type: KqlQueryType.saved_query,
          saved_query_id: 'saved-query-id',
        },
      };

      const result = kqlQueryDiffAlgorithm(mockVersions);

      expect(result).toEqual(
        expect.objectContaining({
          merged_version: mockVersions.current_version,
          diff_outcome: ThreeWayDiffOutcome.CustomizedValueSameUpdate,
          merge_outcome: ThreeWayMergeOutcome.Current,
          conflict: ThreeWayDiffConflict.NONE,
        })
      );
    });

    it('if all versions are query types', () => {
      const mockVersions: ThreeVersionsOf<RuleKqlQuery> = {
        base_version: {
          type: KqlQueryType.inline_query,
          query: 'query string = false',
          language: KqlQueryLanguageEnum.lucene,
          filters: [],
        },
        current_version: {
          type: KqlQueryType.inline_query,
          query: 'query string = false',
          language: KqlQueryLanguageEnum.kuery,
          filters: [],
        },
        target_version: {
          type: KqlQueryType.inline_query,
          query: 'query string = false',
          language: KqlQueryLanguageEnum.kuery,
          filters: [],
        },
      };

      const result = kqlQueryDiffAlgorithm(mockVersions);

      expect(result).toEqual(
        expect.objectContaining({
          merged_version: mockVersions.current_version,
          diff_outcome: ThreeWayDiffOutcome.CustomizedValueSameUpdate,
          merge_outcome: ThreeWayMergeOutcome.Current,
          conflict: ThreeWayDiffConflict.NONE,
        })
      );
    });
  });

  describe('if all three versions are different - scenario ABC', () => {
    describe('if all versions are saved query type', () => {
      it('returns the current_version with a conflict', () => {
        const mockVersions: ThreeVersionsOf<RuleKqlQuery> = {
          base_version: {
            type: KqlQueryType.saved_query,
            saved_query_id: 'saved-query-id-1',
          },
          current_version: {
            type: KqlQueryType.saved_query,
            saved_query_id: 'saved-query-id-2',
          },
          target_version: {
            type: KqlQueryType.saved_query,
            saved_query_id: 'saved-query-id-3',
          },
        };

        const result = kqlQueryDiffAlgorithm(mockVersions);

        expect(result).toEqual(
          expect.objectContaining({
            merged_version: mockVersions.current_version,
            diff_outcome: ThreeWayDiffOutcome.CustomizedValueCanUpdate,
            merge_outcome: ThreeWayMergeOutcome.Current,
            conflict: ThreeWayDiffConflict.NON_SOLVABLE,
          })
        );
      });
    });

    describe('if all versions are inline query type', () => {
      it('returns the current_version with a non-solvable conflict', () => {
        const mockVersions: ThreeVersionsOf<RuleKqlQuery> = {
          base_version: {
            type: KqlQueryType.inline_query,
            query: 'query string = true',
            language: KqlQueryLanguageEnum.kuery,
            filters: [],
          },
          current_version: {
            type: KqlQueryType.inline_query,
            query: 'query string = false',
            language: KqlQueryLanguageEnum.kuery,
            filters: [],
          },
          target_version: {
            type: KqlQueryType.inline_query,
            query: 'query string two = true',
            language: KqlQueryLanguageEnum.kuery,
            filters: [],
          },
        };

        const result = kqlQueryDiffAlgorithm(mockVersions);

        expect(result).toEqual(
          expect.objectContaining({
            merged_version: mockVersions.current_version,
            diff_outcome: ThreeWayDiffOutcome.CustomizedValueCanUpdate,
            merge_outcome: ThreeWayMergeOutcome.Current,
            conflict: ThreeWayDiffConflict.NON_SOLVABLE,
          })
        );
      });

      it('returns the current_version with a non-solvable conflict if one subfield has an ABA scenario and another has an AAB', () => {
        const mockVersions: ThreeVersionsOf<RuleKqlQuery> = {
          base_version: {
            type: KqlQueryType.inline_query,
            query: 'query string = false',
            language: KqlQueryLanguageEnum.lucene,
            filters: [],
          },
          current_version: {
            type: KqlQueryType.inline_query,
            query: 'query string = true',
            language: KqlQueryLanguageEnum.kuery,
            filters: [],
          },
          target_version: {
            type: KqlQueryType.inline_query,
            query: 'query string = false',
            language: KqlQueryLanguageEnum.kuery,
            filters: [{ field: 'some query' }],
          },
        };

        const result = kqlQueryDiffAlgorithm(mockVersions);

        expect(result).toEqual(
          expect.objectContaining({
            merged_version: mockVersions.current_version,
            diff_outcome: ThreeWayDiffOutcome.CustomizedValueCanUpdate,
            merge_outcome: ThreeWayMergeOutcome.Current,
            conflict: ThreeWayDiffConflict.NON_SOLVABLE,
          })
        );
      });
    });

    describe('if versions are different types', () => {
      it('returns the current_version with a non-solvable conflict', () => {
        const mockVersions: ThreeVersionsOf<RuleKqlQuery> = {
          base_version: {
            type: KqlQueryType.inline_query,
            query: 'My description.\nThis is a second line.',
            language: KqlQueryLanguageEnum.kuery,
            filters: [],
          },
          current_version: {
            type: KqlQueryType.saved_query,
            saved_query_id: 'saved-query-id-2',
          },
          target_version: {
            type: KqlQueryType.inline_query,
            query: 'My EXCELLENT description.\nThis is a fourth.',
            language: KqlQueryLanguageEnum.kuery,
            filters: [],
          },
        };

        const result = kqlQueryDiffAlgorithm(mockVersions);

        expect(result).toEqual(
          expect.objectContaining({
            merged_version: mockVersions.current_version,
            diff_outcome: ThreeWayDiffOutcome.CustomizedValueCanUpdate,
            merge_outcome: ThreeWayMergeOutcome.Current,
            conflict: ThreeWayDiffConflict.NON_SOLVABLE,
          })
        );
      });
    });
  });

  describe('if base_version is missing', () => {
    describe('if current_version and target_version are the same - scenario -AA', () => {
      it('returns current_version as merged output if all versions are inline query types', () => {
        const mockVersions: ThreeVersionsOf<RuleKqlQuery> = {
          base_version: MissingVersion,
          current_version: {
            type: KqlQueryType.inline_query,
            query: 'query string = true',
            language: KqlQueryLanguageEnum.kuery,
            filters: [],
          },
          target_version: {
            type: KqlQueryType.inline_query,
            query: 'query string = true',
            language: KqlQueryLanguageEnum.kuery,
            filters: [],
          },
        };

        const result = kqlQueryDiffAlgorithm(mockVersions);

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

      it('returns current_version as merged output if all versions are saved query types', () => {
        const mockVersions: ThreeVersionsOf<RuleKqlQuery> = {
          base_version: MissingVersion,
          current_version: {
            type: KqlQueryType.saved_query,
            saved_query_id: 'saved-query-id',
          },
          target_version: {
            type: KqlQueryType.saved_query,
            saved_query_id: 'saved-query-id',
          },
        };

        const result = kqlQueryDiffAlgorithm(mockVersions);

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
    });

    describe('if current_version and target_version are different - scenario -AB', () => {
      it('returns target_version as merged output if current and target versions have the same types', () => {
        const mockVersions: ThreeVersionsOf<RuleKqlQuery> = {
          base_version: MissingVersion,
          current_version: {
            type: KqlQueryType.inline_query,
            query: 'query string = true',
            language: KqlQueryLanguageEnum.kuery,
            filters: [],
          },
          target_version: {
            type: KqlQueryType.inline_query,
            query: 'query string = false',
            language: KqlQueryLanguageEnum.kuery,
            filters: [],
          },
        };

        const result = kqlQueryDiffAlgorithm(mockVersions);

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

      it('returns target_version as merged output if current and target versions have different types', () => {
        const mockVersions: ThreeVersionsOf<RuleKqlQuery> = {
          base_version: MissingVersion,
          current_version: {
            type: KqlQueryType.saved_query,
            saved_query_id: 'saved-query-id-2',
          },
          target_version: {
            type: KqlQueryType.inline_query,
            query: 'query string = false',
            language: KqlQueryLanguageEnum.kuery,
            filters: [],
          },
        };

        const result = kqlQueryDiffAlgorithm(mockVersions);

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
});
