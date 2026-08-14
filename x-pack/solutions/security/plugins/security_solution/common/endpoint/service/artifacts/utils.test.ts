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
  DESCENDANT_EVENT_SCOPE_TAG_PREFIX,
  FILTER_PROCESS_DESCENDANTS_TAG,
  GLOBAL_ARTIFACT_TAG,
} from './constants';
import {
  buildDescendantEventScopeEntry,
  buildDescendantEventScopeTag,
  getDescendantEventScope,
  isDescendantEventScopeTag,
  buildSpaceOwnerIdTag,
  createExceptionListItemForCreate,
  getArtifactOwnerSpaceIds,
  getArtifactTagsByPolicySelection,
  getEffectedPolicySelectionByTags,
  getPolicyIdsFromArtifact,
  hasArtifactOwnerSpaceId,
  isArtifactByPolicy,
  isArtifactGlobal,
  isProcessDescendantsEnabled,
  isFilterProcessDescendantsTag,
  isPolicySelectionTag,
  setArtifactOwnerSpaceId,
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

  describe('when using `isProcessDescendantsEnabled()`', () => {
    it('should return false when `tags` is undefined', () => {
      expect(isProcessDescendantsEnabled({})).toBe(false);
    });

    it('should return false when `tags` does not contain the relevant tag', () => {
      expect(isProcessDescendantsEnabled({ tags: ['aaa', 'bbb', 'ccc'] })).toBe(false);
    });

    it('should return true when `tags` contain the relevant tag', () => {
      expect(
        isProcessDescendantsEnabled({
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

  describe('when using `buildSpaceOwnerIdTag()`', () => {
    it('should return an artifact tag', () => {
      expect(buildSpaceOwnerIdTag('abc')).toEqual(`ownerSpaceId:abc`);
    });
  });

  describe('when using `getArtifactOwnerSpaceIds()`', () => {
    it.each`
      name                                     | tags                                                                    | expectedResult
      ${'expected array of values'}            | ${{ tags: [buildSpaceOwnerIdTag('abc'), buildSpaceOwnerIdTag('123')] }} | ${['abc', '123']}
      ${'empty array if no tags'}              | ${{}}                                                                   | ${[]}
      ${'empty array if no ownerSpaceId tags'} | ${{ tags: ['one', 'two'] }}                                             | ${[]}
    `('should return $name', ({ tags, expectedResult }) => {
      expect(getArtifactOwnerSpaceIds(tags)).toEqual(expectedResult);
    });
  });

  describe('when using `hasArtifactOwnerSpaceId()`', () => {
    it.each`
      name                                          | tags                                       | expectedResult
      ${'artifact has tag with space id'}           | ${{ tags: [buildSpaceOwnerIdTag('abc')] }} | ${true}
      ${'artifact does not have tag with space id'} | ${{ tags: ['123'] }}                       | ${false}
    `('should return $expectedResult when $name', ({ tags, expectedResult }) => {
      expect(hasArtifactOwnerSpaceId(tags)).toEqual(expectedResult);
    });
  });

  describe('when using `setArtifactOwnerSpaceId()`', () => {
    it('should set owner space ID if item does not currently have one matching the space id', () => {
      const item = { tags: [buildSpaceOwnerIdTag('foo')] };
      setArtifactOwnerSpaceId(item, 'abc');

      expect(item).toEqual({ tags: [buildSpaceOwnerIdTag('foo'), buildSpaceOwnerIdTag('abc')] });
    });

    it('should not add another owner space ID if item already has one that matches the space id', () => {
      const item = { tags: [buildSpaceOwnerIdTag('abc')] };
      setArtifactOwnerSpaceId(item, 'abc');

      expect(item).toEqual({ tags: [buildSpaceOwnerIdTag('abc')] });
    });
  });

  describe('when using `buildDescendantEventScopeTag()`', () => {
    it('should return an artifact tag', () => {
      expect(buildDescendantEventScopeTag(['file'])).toEqual(
        `${DESCENDANT_EVENT_SCOPE_TAG_PREFIX}file`
      );
    });

    it('should keep the event categories in a canonical order', () => {
      expect(buildDescendantEventScopeTag(['network', 'file'])).toEqual(
        buildDescendantEventScopeTag(['file', 'network'])
      );
    });

    it('should skip unknown event categories', () => {
      expect(buildDescendantEventScopeTag(['file', 'not-a-category'])).toEqual(
        `${DESCENDANT_EVENT_SCOPE_TAG_PREFIX}file`
      );
    });
  });

  describe('when using `isDescendantEventScopeTag()`', () => {
    it.each`
      name                     | tag                                           | expectedResult
      ${'an event scope tag'}  | ${`${DESCENDANT_EVENT_SCOPE_TAG_PREFIX}file`} | ${true}
      ${'an empty scope tag'}  | ${DESCENDANT_EVENT_SCOPE_TAG_PREFIX}          | ${true}
      ${'the descendants tag'} | ${FILTER_PROCESS_DESCENDANTS_TAG}             | ${false}
      ${'an unrelated tag'}    | ${'policy:all'}                               | ${false}
    `('should return $expectedResult when tag is $name', ({ tag, expectedResult }) => {
      expect(isDescendantEventScopeTag(tag)).toBe(expectedResult);
    });
  });

  describe('when using `getDescendantEventScope()`', () => {
    it.each`
      name                                         | tags                                                                                                    | expectedResult
      ${'empty array if no tags'}                  | ${{}}                                                                                                   | ${[]}
      ${'empty array if no event scope tag'}       | ${{ tags: [FILTER_PROCESS_DESCENDANTS_TAG] }}                                                           | ${[]}
      ${'empty array if no known category'}        | ${{ tags: [`${DESCENDANT_EVENT_SCOPE_TAG_PREFIX}not-a-category`] }}                                     | ${[]}
      ${'the event categories in tag'}             | ${{ tags: [`${DESCENDANT_EVENT_SCOPE_TAG_PREFIX}file,library`] }}                                       | ${['file', 'library']}
      ${'the event categories in canonical order'} | ${{ tags: [`${DESCENDANT_EVENT_SCOPE_TAG_PREFIX}library, file`] }}                                      | ${['file', 'library']}
      ${'the event categories of all tags'}        | ${{ tags: [`${DESCENDANT_EVENT_SCOPE_TAG_PREFIX}library`, `${DESCENDANT_EVENT_SCOPE_TAG_PREFIX}file`] }} | ${['file', 'library']}
      ${'the known event categories only'}         | ${{ tags: [`${DESCENDANT_EVENT_SCOPE_TAG_PREFIX}file,not-a-category`] }}                                | ${['file']}
    `('should return $name', ({ tags, expectedResult }) => {
      expect(getDescendantEventScope(tags)).toEqual(expectedResult);
    });
  });

  describe('when using `buildDescendantEventScopeEntry()`', () => {
    it('should return an exception item entry matching any of the event categories', () => {
      expect(buildDescendantEventScopeEntry(['file', 'library'])).toEqual({
        field: 'event.category',
        operator: 'included',
        type: 'match_any',
        value: ['file', 'library'],
      });
    });
  });
});
