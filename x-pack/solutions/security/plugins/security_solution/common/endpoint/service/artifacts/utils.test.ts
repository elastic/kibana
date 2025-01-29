/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import type { PolicyData } from '../../types';
import {
  BY_POLICY_ARTIFACT_TAG_PREFIX,
  FILTER_PROCESS_DESCENDANTS_TAG,
  GLOBAL_ARTIFACT_TAG,
} from './constants';
import {
  createExceptionListItemForCreate,
  getArtifactTagsByPolicySelection,
  getEffectedPolicySelectionByTags,
  getPolicyIdsFromArtifact,
  isArtifactByPolicy,
  isArtifactGlobal,
  isFilterProcessDescendantsEnabled,
  isFilterProcessDescendantsTag,
  isPolicySelectionTag,
} from './utils';

describe('Endpoint artifact utilities', () => {
  let globalEntry: Pick<ExceptionListItemSchema, 'tags'>;
  let perPolicyWithPolicy: Pick<ExceptionListItemSchema, 'tags'>;
  let perPolicyNoPolicies: Pick<ExceptionListItemSchema, 'tags'>;

  beforeEach(() => {
    globalEntry = {
      tags: [GLOBAL_ARTIFACT_TAG],
    };

    perPolicyWithPolicy = {
      tags: [`${BY_POLICY_ARTIFACT_TAG_PREFIX}123`, `${BY_POLICY_ARTIFACT_TAG_PREFIX}456`],
    };

    perPolicyNoPolicies = {
      tags: [],
    };
  });

  describe('when using `isArtifactGlobal()', () => {
    it('should return `true` if artifact is global', () => {
      expect(isArtifactGlobal(globalEntry)).toBe(true);
    });

    it('should return `false` if artifact is per-policy', () => {
      expect(isArtifactGlobal(perPolicyWithPolicy)).toBe(false);
    });

    it('should return `false` if artifact is per-policy but not assigned to any policy', () => {
      expect(isArtifactGlobal(perPolicyNoPolicies)).toBe(false);
    });

    it('should return `false` if `tags` is undefined', () => {
      expect(isArtifactGlobal({})).toBe(false);
    });
  });

  describe('when using `isArtifactByPolicy()', () => {
    it('should return `true` if artifact is per-policy', () => {
      expect(isArtifactByPolicy(perPolicyWithPolicy)).toBe(true);
    });

    it('should return `true` if artifact is per-policy but not assigned to any policy', () => {
      expect(isArtifactByPolicy(perPolicyNoPolicies)).toBe(true);
    });

    it('should return `false` if artifact is global', () => {
      expect(isArtifactByPolicy(globalEntry)).toBe(false);
    });
  });

  describe('when using `getPolicyIdsFromArtifact()`', () => {
    it('should return array of policies', () => {
      expect(getPolicyIdsFromArtifact(perPolicyWithPolicy)).toEqual(['123', '456']);
    });

    it('should return empty array if there are none', () => {
      expect(getPolicyIdsFromArtifact(perPolicyNoPolicies)).toEqual([]);
    });
  });

  describe('when using `isPolicySelectionTag()`', () => {
    it('should return true if tag starts with prefix', () => {
      expect(isPolicySelectionTag(`${BY_POLICY_ARTIFACT_TAG_PREFIX}cheese`)).toBe(true);
    });

    it('should return true if tag equals global artifact tag', () => {
      expect(isPolicySelectionTag(GLOBAL_ARTIFACT_TAG)).toBe(true);
    });

    it('should return false otherwise', () => {
      expect(isPolicySelectionTag('otherwise')).toBe(false);
    });
  });

  describe('when using `getArtifactTagsByPolicySelection()`', () => {
    const policyData: Array<Pick<PolicyData, 'id'>> = [
      { id: 'id1' },
      { id: 'id2' },
    ] as PolicyData[];

    it('should return global artifact tag if is global', () => {
      expect(
        getArtifactTagsByPolicySelection({
          isGlobal: true,
          selected: policyData as PolicyData[],
        })
      ).toStrictEqual([GLOBAL_ARTIFACT_TAG]);
    });

    it('should return every passed policy id with tag prefix if not global', () => {
      expect(
        getArtifactTagsByPolicySelection({
          isGlobal: false,
          selected: policyData as PolicyData[],
        })
      ).toStrictEqual(['policy:id1', 'policy:id2']);
    });
  });

  describe('when using `getEffectedPolicySelectionByTags()`', () => {
    const policyData: Array<Pick<PolicyData, 'id'>> = [{ id: 'id1' }, { id: 'id2' }, { id: 'id3' }];

    it('should return `isGlobal: true` when global tag is amongst tags', () => {
      expect(
        getEffectedPolicySelectionByTags(
          ['cheese', GLOBAL_ARTIFACT_TAG, 'bacon'],
          policyData as PolicyData[]
        )
      ).toStrictEqual({ isGlobal: true, selected: [] });
    });

    it('should return relevant policy data when not global', () => {
      expect(
        getEffectedPolicySelectionByTags(
          ['cheese', 'policy:id3', 'bacon', 'policy:id1'],
          policyData as PolicyData[]
        )
      ).toStrictEqual({ isGlobal: false, selected: [{ id: 'id3' }, { id: 'id1' }] });
    });
  });

  describe('when using `isFilterProcessDescendantsEnabled()`', () => {
    it('should return false when `tags` is undefined', () => {
      expect(isFilterProcessDescendantsEnabled({})).toBe(false);
    });

    it('should return false when `tags` does not contain the relevant tag', () => {
      expect(isFilterProcessDescendantsEnabled({ tags: ['aaa', 'bbb', 'ccc'] })).toBe(false);
    });

    it('should return true when `tags` contain the relevant tag', () => {
      expect(
        isFilterProcessDescendantsEnabled({
          tags: ['aaa', 'bbb', FILTER_PROCESS_DESCENDANTS_TAG, 'ccc'],
        })
      ).toBe(true);
    });
  });

  describe('when using `isFilterProcessDescendantsTag()`', () => {
    it('should return true if tag equals with the filter process descendants tag', () => {
      expect(isFilterProcessDescendantsTag(FILTER_PROCESS_DESCENDANTS_TAG)).toBe(true);
    });

    it('should return false otherwise', () => {
      expect(isFilterProcessDescendantsTag('otherwise')).toBe(false);
    });
  });

  describe('when using `createExceptionListItemForCreate()`', () => {
    it('should return an empty exception list ready for create', () => {
      expect(createExceptionListItemForCreate('abc')).toEqual({
        comments: [],
        description: '',
        entries: [],
        item_id: undefined,
        list_id: 'abc',
        meta: {
          temporaryUuid: expect.any(String),
        },
        name: '',
        namespace_type: 'agnostic',
        tags: [GLOBAL_ARTIFACT_TAG],
        type: 'simple',
        os_types: ['windows'],
      });
    });
  });
});
