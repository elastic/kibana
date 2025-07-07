/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ExceptionListItemSchema,
  CreateExceptionListItemSchema,
} from '@kbn/securitysolution-io-ts-list-types';
import { v4 as uuidv4 } from 'uuid';
import type { EffectedPolicySelection } from '../../../../public/management/components/effected_policy_select';
import type { PolicyData } from '../../types';
import {
  BY_POLICY_ARTIFACT_TAG_PREFIX,
  FILTER_PROCESS_DESCENDANTS_TAG,
  GLOBAL_ARTIFACT_TAG,
  OWNER_SPACE_ID_TAG_PREFIX,
} from './constants';

export type TagFilter = (tag: string) => boolean;

const POLICY_ID_START_POSITION = BY_POLICY_ARTIFACT_TAG_PREFIX.length;

export const isArtifactGlobal = (item: Partial<Pick<ExceptionListItemSchema, 'tags'>>): boolean => {
  return (item.tags ?? []).includes(GLOBAL_ARTIFACT_TAG);
};

export const isArtifactByPolicy = (
  item: Partial<Pick<ExceptionListItemSchema, 'tags'>>
): boolean => {
  return !isArtifactGlobal(item);
};

export const hasGlobalOrPerPolicyTag = (
  item: Partial<Pick<ExceptionListItemSchema, 'tags'>>
): boolean => {
  return (item.tags ?? []).some(
    (tag) => tag === GLOBAL_ARTIFACT_TAG || tag.startsWith(BY_POLICY_ARTIFACT_TAG_PREFIX)
  );
};

export const getPolicyIdsFromArtifact = (
  item: Partial<Pick<ExceptionListItemSchema, 'tags'>>
): string[] => {
  const policyIds = [];
  const tags = item.tags ?? [];

  for (const tag of tags) {
    if (tag !== GLOBAL_ARTIFACT_TAG && tag.startsWith(BY_POLICY_ARTIFACT_TAG_PREFIX)) {
      policyIds.push(tag.substring(POLICY_ID_START_POSITION));
    }
  }

  return policyIds;
};

/**
 * Given an Artifact tag value, utility will return a boolean indicating if that tag is
 * tracking artifact assignment (global/per-policy)
 */
export const isPolicySelectionTag: TagFilter = (tag) =>
  tag.startsWith(BY_POLICY_ARTIFACT_TAG_PREFIX) || tag === GLOBAL_ARTIFACT_TAG;

/**
 * Builds the per-policy tag that should be stored in the artifact's `tags` array
 * @param policyId
 */
export const buildPerPolicyTag = (policyId: string): string => {
  return `${BY_POLICY_ARTIFACT_TAG_PREFIX}${policyId}`;
};

/**
 * Return a list of artifact policy tags based on a current
 * selection by the EffectedPolicySelection component.
 */
export const getArtifactTagsByPolicySelection = (selection: EffectedPolicySelection): string[] => {
  if (selection.isGlobal) {
    return [GLOBAL_ARTIFACT_TAG];
  }

  return selection.selected.map((policy) => {
    return buildPerPolicyTag(policy.id);
  });
};

/**
 * Given a list of an Exception item tags it will return
 * the parsed policies from it.
 *
 * Policy tags follow the pattern `policy:id`
 * non policy tags will be ignored.
 */
export const getEffectedPolicySelectionByTags = (
  tags: string[],
  policies: PolicyData[]
): EffectedPolicySelection => {
  if (tags.find((tag) => tag === GLOBAL_ARTIFACT_TAG)) {
    return {
      isGlobal: true,
      selected: [],
    };
  }
  const selected: PolicyData[] = tags.reduce((acc, tag) => {
    if (tag.startsWith(BY_POLICY_ARTIFACT_TAG_PREFIX)) {
      const id = tag.split(':')[1];
      const foundPolicy = policies.find((policy) => policy.id === id);

      // edge case: a left over tag with a non-existed policy will be removed by verifying the policy exists
      if (foundPolicy !== undefined) {
        acc.push(foundPolicy);
      }
    }

    return acc;
  }, [] as PolicyData[]);

  return {
    isGlobal: false,
    selected,
  };
};

export const isFilterProcessDescendantsEnabled = (
  item: Partial<Pick<ExceptionListItemSchema, 'tags'>>
): boolean => (item.tags ?? []).includes(FILTER_PROCESS_DESCENDANTS_TAG);

export const isFilterProcessDescendantsTag: TagFilter = (tag) =>
  tag === FILTER_PROCESS_DESCENDANTS_TAG;

export const createExceptionListItemForCreate = (listId: string): CreateExceptionListItemSchema => {
  return {
    comments: [],
    description: '',
    entries: [],
    item_id: undefined,
    list_id: listId,
    meta: {
      temporaryUuid: uuidv4(),
    },
    name: '',
    namespace_type: 'agnostic',
    tags: [GLOBAL_ARTIFACT_TAG],
    type: 'simple',
    os_types: ['windows'],
  };
};

/**
 * Checks the provided `tag` string to see if it is an owner apace ID tag
 * @param tag
 */
export const isOwnerSpaceIdTag = (tag: string): boolean => {
  return tag.startsWith(OWNER_SPACE_ID_TAG_PREFIX);
};

/**
 * Returns an array with all owner space IDs for the artifact
 */
export const getArtifactOwnerSpaceIds = (
  item: Partial<Pick<ExceptionListItemSchema, 'tags'>>
): string[] => {
  return (item.tags ?? []).reduce((acc, tag) => {
    if (isOwnerSpaceIdTag(tag)) {
      acc.push(tag.substring(OWNER_SPACE_ID_TAG_PREFIX.length));
    }

    return acc;
  }, [] as string[]);
};

/** Returns an Artifact `tag` value for a given space id */
export const buildSpaceOwnerIdTag = (spaceId: string): string => {
  if (spaceId.trim() === '') {
    throw new Error('spaceId must be a string with a length greater than zero.');
  }

  return `${OWNER_SPACE_ID_TAG_PREFIX}${spaceId}`;
};

/**
 * Sets the owner space id on the given artifact, if not already present.
 *
 * NOTE: this utility will mutate the artifact exception list item provided on input.
 *
 * @param item
 * @param spaceId
 */
export const setArtifactOwnerSpaceId = (
  item: Partial<Pick<ExceptionListItemSchema, 'tags'>>,
  spaceId: string
): void => {
  if (spaceId.trim() === '') {
    throw new Error('spaceId must be a string with a length greater than zero.');
  }

  if (!getArtifactOwnerSpaceIds(item).includes(spaceId)) {
    if (!item.tags) {
      item.tags = [];
    }

    item.tags.push(buildSpaceOwnerIdTag(spaceId));
  }
};

/**
 * Checks to see if the artifact item has at least 1 owner space id tag
 * @param item
 */
export const hasArtifactOwnerSpaceId = (
  item: Partial<Pick<ExceptionListItemSchema, 'tags'>>
): boolean => {
  return (item.tags ?? []).some((tag) => isOwnerSpaceIdTag(tag));
};
