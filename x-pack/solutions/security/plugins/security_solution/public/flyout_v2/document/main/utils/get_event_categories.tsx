/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataTableRecord } from '@kbn/discover-utils';
import { EVENT_CATEGORY_FIELD } from '@kbn/discover-utils';

interface EventCategories {
  primaryEventCategory?: string;
  allEventCategories?: string[];
}

/**
 * Extract the event's categories
 * @param hit The event record
 * @returns The event's primary category and all other categories in case there is more than one
 */
export function getEventCategoriesFromData(hit: DataTableRecord): EventCategories {
  const eventCategoryField = hit.flattened[EVENT_CATEGORY_FIELD];

  let primaryEventCategory: string | undefined;
  let allEventCategories: string[] | undefined;

  if (Array.isArray(eventCategoryField)) {
    allEventCategories = eventCategoryField.map(String);
    primaryEventCategory = allEventCategories[0];
  } else {
    primaryEventCategory = eventCategoryField != null ? String(eventCategoryField) : undefined;
    if (primaryEventCategory) {
      allEventCategories = [primaryEventCategory];
    }
  }

  return { primaryEventCategory, allEventCategories };
}
