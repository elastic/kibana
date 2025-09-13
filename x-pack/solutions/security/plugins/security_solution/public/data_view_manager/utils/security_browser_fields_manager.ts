/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BrowserFields } from '@kbn/timelines-plugin/common';
import type { DataView } from '@kbn/data-views-plugin/public';
import { getCategory } from '@kbn/response-ops-alerts-fields-browser/helpers';
import { LRUCache as LRU } from 'lru-cache';

type DataViewId = NonNullable<DataView['id']>;
interface BrowserFieldsResult {
  browserFields: BrowserFields;
}

// NOTE:for referential comparison optimization
const emptyBrowserFields = {};

export const MAX_DATAVIEWS_TO_CACHE = 5; // only store a max of 5 data views
export const MAX_NUMBER_OF_FIELDS_TO_CACHE = 1_000_000; // 1 million fields
export const BROWSER_FIELDS_CACHE_TTL = 60 * 60 * 1000; // one hour

/**
 * SecurityBrowserFieldsManager is a singleton class that manages the browser fields
 * for the Security Solution. It caches the browser fields to improve performance
 * as the same dataView can be accessed multiple times across multiple scopes.
 *
 * We use an LRU cache to limit memory usage and ensure that the most recently
 * accessed dataViews are kept in memory. The cache is limited by both the number
 * of dataViews and the total number of fields across all cached dataViews.
 */
class SecurityBrowserFieldsManager {
  private static instance: SecurityBrowserFieldsManager;
  private browserFieldsCache = new LRU<DataViewId, BrowserFieldsResult>({
    max: MAX_DATAVIEWS_TO_CACHE,
    maxSize: MAX_NUMBER_OF_FIELDS_TO_CACHE,
    ttl: BROWSER_FIELDS_CACHE_TTL,
  });

  constructor() {
    if (SecurityBrowserFieldsManager.instance) {
      return SecurityBrowserFieldsManager.instance;
    }
    SecurityBrowserFieldsManager.instance = this;
  }

  /**
   * Builds the browser fields from the provided dataView fields.
   * We use a for loop for performance reasons, as this function could be called
   * multiple times and we want to minimize the overhead of array methods.
   * @param fields - The fields from the dataView to be processed.
   * @returns An object containing the formatted browserFields.
   */
  private buildBrowserFields(fields: DataView['fields']): BrowserFieldsResult {
    if (fields == null || !fields.length) return { browserFields: emptyBrowserFields };

    const browserFields: BrowserFields = {};
    for (let i = 0; i < fields.length; i++) {
      const field = fields[i].spec;
      const name = field.name;
      if (name != null) {
        const category = getCategory(name);
        if (browserFields[category] == null) {
          browserFields[category] = { fields: {} };
        }
        const categoryFields = browserFields[category].fields;
        if (categoryFields) {
          categoryFields[name] = field;
        }
      }
    }

    return { browserFields };
  }

  /**
   *
   * @param dataView - The dataView containing the fields to be processed.
   * @returns An object containing the browserFields built from the dataView fields.
   */
  public getBrowserFields(dataView: DataView): BrowserFieldsResult {
    const { fields } = dataView;
    // If the dataView has no fields, return an empty browserFields object
    if (!fields || fields.length === 0) {
      return { browserFields: emptyBrowserFields };
    }

    const dataViewId = dataView.id;
    // Only cache if the dataView has an id
    if (dataViewId == null) {
      return this.buildBrowserFields(fields);
    }

    const cachedResult = this.browserFieldsCache.get(dataViewId);
    if (cachedResult) return cachedResult;

    const result = this.buildBrowserFields(fields);
    this.browserFieldsCache.set(dataViewId, result, { size: fields.length });
    return result;
  }

  public removeFromCache(dataViewId: DataViewId): void {
    if (dataViewId != null && this.browserFieldsCache.has(dataViewId)) {
      this.browserFieldsCache.delete(dataViewId);
    }
  }

  /**
   * Clear all caches in the SecurityBrowserFieldsManager.
   * This method is useful for resetting the state of the manager, especially during tests
   */
  public clearCache(): void {
    this.browserFieldsCache.clear();
  }
}

export const browserFieldsManager = new SecurityBrowserFieldsManager();
