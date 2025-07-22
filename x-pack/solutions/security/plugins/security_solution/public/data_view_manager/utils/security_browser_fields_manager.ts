/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BrowserFields } from '@kbn/timelines-plugin/common';
import type { DataView } from '@kbn/data-views-plugin/public';
import { getCategory } from '@kbn/response-ops-alerts-fields-browser/helpers';
import type { DataViewManagerScopeName } from '../constants';

type DataViewTitle = ReturnType<DataView['getIndexPattern']>;
interface BrowserFieldsResult {
  browserFields: BrowserFields;
}

/**
 * SecurityBrowserFieldsManager is a singleton class that manages the browser fields
 * for the Security Solution. It caches the browser fields to improve performance
 * when accessing the fields multiple times across multiple scopes.
 */
class SecurityBrowserFieldsManager {
  private static instance: SecurityBrowserFieldsManager;
  private scopeToDataViewIndexPatternsCache = new Map<DataViewManagerScopeName, DataViewTitle>();
  private dataViewIndexPatternsToBrowserFieldsCache = new Map<DataViewTitle, BrowserFieldsResult>();

  constructor() {
    if (SecurityBrowserFieldsManager.instance) {
      return SecurityBrowserFieldsManager.instance;
    }
    SecurityBrowserFieldsManager.instance = this;
  }

  /**
   * Builds the browser fields from the provided dataView fields.
   * @param fields - The fields from the dataView to be processed.
   * @returns An object containing the browserFields.
   */
  private buildBrowserFields(fields: DataView['fields']): BrowserFieldsResult {
    if (fields == null) return { browserFields: {} };

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
   * @param dataViewtitle - The title of the dataView, which is used as a key for caching.
   * This is typically the index pattern of the dataView.
   * @param scope - The scope of the data view manager, used to differentiate between different contexts.
   * @returns The cached browser fields for the specified dataView title and scope, or undefined if not found.
   */
  private getCachedBrowserFields(
    dataViewTitle: DataViewTitle,
    scope: DataViewManagerScopeName
  ): BrowserFieldsResult | undefined {
    // Check if the scope is already mapped to a dataView title
    const cachedDataViewTitle = this.scopeToDataViewIndexPatternsCache.get(scope);
    if (cachedDataViewTitle && cachedDataViewTitle === dataViewTitle) {
      // If the title matches, return the cached browser fields
      const cachedResult = this.dataViewIndexPatternsToBrowserFieldsCache.get(cachedDataViewTitle);
      if (cachedResult) {
        return cachedResult;
      }
    }
    // If the title does not match or is not cached, update the cache with the new title
    this.scopeToDataViewIndexPatternsCache.set(scope, dataViewTitle);
    // Check if the browser fields for this title are already cached
    const cachedBrowserFields = this.dataViewIndexPatternsToBrowserFieldsCache.get(dataViewTitle);
    if (cachedBrowserFields) {
      return cachedBrowserFields;
    }
    return undefined;
  }
  /**
   *
   * @param dataView - The dataView containing the fields to be processed.
   * @param [scope] - Optional The scope of the data view manager, used to differentiate between different contexts.
   * If passed, will use cache for the specified scope, but can be ignored if caching is not desired.
   * @returns An object containing the browserFields built from the dataView fields.
   */
  public getBrowserFields(
    dataView: DataView,
    scope?: DataViewManagerScopeName
  ): BrowserFieldsResult {
    const { fields } = dataView;
    // If the dataView has no fields, return an empty browserFields object
    if (!fields || fields.length === 0) {
      return { browserFields: {} };
    }

    const indexPatterns = dataView.getIndexPattern();

    // Caching depends on the scope and title
    if (scope && indexPatterns) {
      const cachedResult = this.getCachedBrowserFields(indexPatterns, scope);
      if (cachedResult) {
        // If the browser fields for this indexPatterns are cached, return them
        return cachedResult;
      }
      // If the browser fields for this indexPatterns are not cached, build them
      const result = this.buildBrowserFields(fields);
      this.dataViewIndexPatternsToBrowserFieldsCache.set(indexPatterns, result);
      return result;
    }

    // If scope is not provided or title is not defined, return the browser fields without caching
    return this.buildBrowserFields(fields);
  }

  public removeFromCache(scope: DataViewManagerScopeName): void {
    const indexPatterns = this.scopeToDataViewIndexPatternsCache.get(scope);
    if (indexPatterns) {
      this.scopeToDataViewIndexPatternsCache.delete(scope);
      const scopesUsingIndexPattern = Array.from(this.scopeToDataViewIndexPatternsCache.values());

      if (!scopesUsingIndexPattern.includes(indexPatterns)) {
        // If no other scope is using this indexPattern, remove it from the browser fields cache
        this.dataViewIndexPatternsToBrowserFieldsCache.delete(indexPatterns);
      }
    }
  }

  /**
   * Clear all caches in the SecurityBrowserFieldsManager.
   * This method is useful for resetting the state of the manager, especially during tests
   */
  public clearCache(): void {
    this.scopeToDataViewIndexPatternsCache.clear();
    this.dataViewIndexPatternsToBrowserFieldsCache.clear();
  }
}

export const browserFieldsManager = new SecurityBrowserFieldsManager();
