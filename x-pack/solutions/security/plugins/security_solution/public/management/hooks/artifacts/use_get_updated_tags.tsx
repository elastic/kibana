/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import { useCallback } from 'react';
import type { TagFilter } from '../../../../common/endpoint/service/artifacts/utils';
import {
  isAdvancedModeTag,
  isOwnerSpaceIdTag,
  isFilterProcessDescendantsTag,
  isPolicySelectionTag,
  isTrustedProcessDescendantsTag,
} from '../../../../common/endpoint/service/artifacts/utils';

interface TagFiltersType {
  [tagCategory: string]: TagFilter;
}

interface TagUpdateOperation<TagFilters> {
  tagType: keyof TagFilters;
  newTags: string[];
}

type GetTagsUpdatedBy<TagFilters> = (tagType: keyof TagFilters, newTags: string[]) => string[];

type GetMultipleTagsUpdatedBy<TagFilters> = (
  updates: Array<TagUpdateOperation<TagFilters>>
) => string[];

const DEFAULT_FILTERS = Object.freeze({
  policySelection: isPolicySelectionTag,
  processDescendantsFiltering: isFilterProcessDescendantsTag,
  trustedProcessDescendants: isTrustedProcessDescendantsTag,
  advancedMode: isAdvancedModeTag,
  ownerSpaceId: isOwnerSpaceIdTag,
} as const);

/**
 * A hook that returns a callback for using in updating the complete list of `tags` on an artifact.
 * The callback will replace a given type of tag with new set of values - example: update the list
 * of tags on an artifact with a new list of policy assignment tags.
 *
 * The hook uses a `filter` object (can be overwritten on input) that contain a simple filter
 * function that is used to identify tags for that category.
 *
 * ```
 * const FILTERS_IN_ORDER = { // preferably defined out of the component
 *  first: (tag) => tag.startsWith('1:'),
 *  second: (tag) => tag.startsWith('2:'),
 * }
 * ...
 * const { getTagsUpdatedBy, getMultipleTagsUpdatedBy } = useGetUpdatedTags(exception, FILTERS_IN_ORDER)
 * ```
 *
 * The returned `getTagsUpdatedBy()` function can be used in event handlers to update a single
 * tag category:
 * ```
 * const newTags = getTagsUpdatedBy('second', ['2:new-tag'])
 * ```
 *
 * The returned `getMultipleTagsUpdatedBy()` function can be used to update multiple tag
 * categories at once without affecting other tags:
 * ```
 * const newTags = getMultipleTagsUpdatedBy([
 *   { tagType: 'second', newTags: ['2:new-tag-1'] },
 *   { tagType: 'first', newTags: ['1:new-tag-2'] }
 * ])
 * ```
 *
 * @param exception
 * @param filters
 * @returns `getTagsUpdatedBy('category', ['new', 'tags'])` and `getMultipleTagsUpdatedBy([{ tagType: 'category', newTags: ['new', 'tags'] }])`
 */
export const useGetUpdatedTags = <TagFilters extends TagFiltersType = typeof DEFAULT_FILTERS>(
  exception: Partial<Pick<ExceptionListItemSchema, 'tags'>>,
  filters: TagFilters = DEFAULT_FILTERS as unknown as TagFilters
): Readonly<{
  getTagsUpdatedBy: GetTagsUpdatedBy<TagFilters>;
  getMultipleTagsUpdatedBy: GetMultipleTagsUpdatedBy<TagFilters>;
}> => {
  const getTagsUpdatedBy: GetTagsUpdatedBy<TagFilters> = useCallback(
    (tagType, newTags) => {
      if (!filters[tagType]) {
        throw new Error(
          `getTagsUpdatedBy() was called with an unknown tag type: ${String(tagType)}`
        );
      }

      return (exception.tags ?? []).filter((tag) => !filters[tagType](tag)).concat(...newTags);
    },
    [exception, filters]
  );

  const getMultipleTagsUpdatedBy: GetMultipleTagsUpdatedBy<TagFilters> = useCallback(
    (updates) => {
      let currentTags = exception.tags ?? [];

      for (const { tagType, newTags } of updates) {
        if (!filters[tagType]) {
          throw new Error(
            `getMultipleTagsUpdatedBy() was called with an unknown tag type: ${String(tagType)}`
          );
        }

        // Filter out old tags of this type and add new tags
        currentTags = currentTags.filter((tag) => !filters[tagType](tag)).concat(...newTags);
      }

      return currentTags;
    },
    [exception, filters]
  );

  return {
    /**
     * @param tagType the type of tag to update
     * @param newTags the new tags to use for this type
     * @return a new tags array with the updates applied
     */
    getTagsUpdatedBy,
    /**
     * @param updates Array of tag update operations containing tagType and newTags
     * @return a new tags array with all updates applied
     */
    getMultipleTagsUpdatedBy,
  };
};
