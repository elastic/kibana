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
  isOwnerSpaceIdTag,
  isFilterProcessDescendantsTag,
  isPolicySelectionTag,
} from '../../../../common/endpoint/service/artifacts/utils';

interface TagFiltersType {
  [tagCategory: string]: TagFilter;
}

type GetTagsUpdatedBy<TagFilters> = (tagType: keyof TagFilters, newTags: string[]) => string[];

const DEFAULT_FILTERS = Object.freeze({
  policySelection: isPolicySelectionTag,
  processDescendantsFiltering: isFilterProcessDescendantsTag,
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
 * const { getTagsUpdatedBy } = useGetUpdatedTags(exception, FILTERS_IN_ORDER)
 * ```
 *
 * The returned `getTagsUpdatedBy()` function can be used in event handlers of the given tag category
 * without affecting other tags.
 * ```
 * const newTags = getTagsUpdatedBy('second', ['2:new-tag-1', ...])
 * ```
 *
 * @param exception
 * @param filters
 * @returns `getTagsUpdatedBy(tagCategory, ['new', 'tags'])`
 */
export const useGetUpdatedTags = <TagFilters extends TagFiltersType = typeof DEFAULT_FILTERS>(
  exception: Partial<Pick<ExceptionListItemSchema, 'tags'>>,
  filters: TagFilters = DEFAULT_FILTERS as unknown as TagFilters
): Readonly<{
  getTagsUpdatedBy: GetTagsUpdatedBy<TagFilters>;
}> => {
  const getTagsUpdatedBy: GetTagsUpdatedBy<TagFilters> = useCallback(
    (tagType, newTags) => {
      if (!filters[tagType]) {
        throw new Error(
          `getTagsUpdateBy() was called with an unknown tag type: ${String(tagType)}`
        );
      }

      return (exception.tags ?? []).filter((tag) => !filters[tagType](tag)).concat(...newTags);
    },
    [exception, filters]
  );

  return {
    /**
     * @param tagsToUpdate The category of the tags to update, keys of the filter object.
     * @param newTags
     * @return a new tags array
     */
    getTagsUpdatedBy,
  };
};
