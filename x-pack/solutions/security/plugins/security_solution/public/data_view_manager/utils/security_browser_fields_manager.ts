/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BrowserFields } from '@kbn/timelines-plugin/common';
import type { DataView } from '@kbn/data-views-plugin/public';
import { getCategory } from '@kbn/response-ops-alerts-fields-browser/helpers';

type DataViewId = DataView['id'];
interface BrowserFieldsResult {
  browserFields: BrowserFields;
}

// NOTE:for referential comparison optimization
const emptyBrowserFields = {};

/**
 * SecurityBrowserFieldsManager is a singleton class that manages the browser fields
 * for the Security Solution. It caches the browser fields to improve performance
 * when accessing the fields multiple times across multiple scopes.
 */
class SecurityBrowserFieldsManager {
  private static instance: SecurityBrowserFieldsManager;
  private dataViewIdToBrowserFieldsCache = new Map<DataViewId, BrowserFieldsResult>();

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
   * @returns An object containing the browserFields.
   */
  private buildBrowserFields(fields: DataView['fields']): BrowserFieldsResult {
    if (fields == null) return { browserFields: emptyBrowserFields };

    if (!fields.length) {
      return { browserFields: emptyBrowserFields };
    }

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
   * @param dataViewId - The unique identifier of the dataView. This field is only set for saved dataViews.
   * Adhoc dataViews do not have an id and will not be cached.
   * @returns The cached browser fields for the specified dataView id, or undefined if not found.
   */
  private getCachedBrowserFields(dataViewId: DataViewId): BrowserFieldsResult | undefined {
    if (dataViewId != null) {
      // Check if the browser fields for this id are already cached
      const cachedBrowserFields = this.dataViewIdToBrowserFieldsCache.get(dataViewId);
      if (cachedBrowserFields) {
        return cachedBrowserFields;
      }
      return undefined;
    }
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

    // Caching depends on the scope and title
    if (dataViewId != null) {
      const cachedResult = this.getCachedBrowserFields(dataViewId);
      if (cachedResult) {
        // If the browser fields for this dataView are cached, return them
        return cachedResult;
      }
      // If the browser fields for this dataView are not cached, build them
      const result = this.buildBrowserFields(fields);
      this.dataViewIdToBrowserFieldsCache.set(dataViewId, result);
      return result;
    }

    // If the id is not defined (i.e. for adhoc dataViews), return the browser fields without caching
    return this.buildBrowserFields(fields);
  }

  public removeFromCache(dataViewId: DataViewId): void {
    if (dataViewId != null && this.dataViewIdToBrowserFieldsCache.has(dataViewId)) {
      this.dataViewIdToBrowserFieldsCache.delete(dataViewId);
    }
  }

  /**
   * Clear all caches in the SecurityBrowserFieldsManager.
   * This method is useful for resetting the state of the manager, especially during tests
   */
  public clearCache(): void {
    this.dataViewIdToBrowserFieldsCache.clear();
  }
}

export const browserFieldsManager = new SecurityBrowserFieldsManager();
