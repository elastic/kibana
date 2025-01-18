/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import { useCallback } from 'react';
import type { TagFilter } from '../../../../common/endpoint/service/artifacts/utils';

type TagFiltersType = {
  [tagCategory in string]: TagFilter;
};

type GetTagsUpdatedBy<TagFilters> = (tagsToUpdate: keyof TagFilters, newTags: string[]) => string[];

/**
 * A hook to be used to generate a new `tags` array that contains multiple 'categories' of tags,
 * e.g. policy assignment, some special settings, in a desired order.
 *
 * The hook excepts a `filter` object that contain a simple filter function for every tag
 * category. The `filter` object should contain the filters in the same ORDER as the categories
 * should appear in the `tags` array.
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
export const useGetUpdatedTags = <TagFilters extends TagFiltersType>(
  exception: Partial<Pick<ExceptionListItemSchema, 'tags'>>,
  filters: TagFilters
): {
  getTagsUpdatedBy: GetTagsUpdatedBy<TagFilters>;
} => {
  const getTagsUpdatedBy: GetTagsUpdatedBy<TagFilters> = useCallback(
    (tagsToUpdate, newTags) => {
      const tagCategories = Object.keys(filters);

      const arrayOfTagArrays: string[][] = tagCategories.map((category) => {
        if (tagsToUpdate === category) {
          return newTags;
        }

        return (exception.tags ?? []).filter(filters[category]);
      });

      return arrayOfTagArrays.flat();
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
