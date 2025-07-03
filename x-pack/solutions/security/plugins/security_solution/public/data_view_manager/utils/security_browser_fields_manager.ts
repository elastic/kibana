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
/**
 * SecurityBrowserFieldsManager is a singleton class that manages the browser fields
 * for the Security Solution. It caches the browser fields to improve performance
 * when accessing the fields multiple times across multiple scopes.
 */

type DataViewTitle = ReturnType<DataView['getIndexPattern']>;
class SecurityBrowserFieldsManager {
  private static instance: SecurityBrowserFieldsManager;
  private scopeToDataViewIndexPatternsCache = new Map<DataViewManagerScopeName, DataViewTitle>();
  private dataViewIndexPatternsToBrowserFieldsCache = new Map<
    DataViewTitle,
    { browserFields: BrowserFields }
  >();

  constructor() {
    if (SecurityBrowserFieldsManager.instance) {
      return SecurityBrowserFieldsManager.instance;
    }
    SecurityBrowserFieldsManager.instance = this;
  }

  private buildBrowserFields(fields: DataView['fields']): { browserFields: BrowserFields } {
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

  private getCachedBrowserFields(
    title: DataViewTitle,
    scope: DataViewManagerScopeName
  ): { browserFields: BrowserFields } | undefined {
    // Check if the scope is already mapped to a dataView title
    if (this.scopeToDataViewIndexPatternsCache.has(scope)) {
      const cachedTitle = this.scopeToDataViewIndexPatternsCache.get(scope);
      if (cachedTitle === title) {
        // If the title matches, return the cached browser fields
        const cachedResult = this.dataViewIndexPatternsToBrowserFieldsCache.get(cachedTitle);
        if (cachedResult) {
          return cachedResult;
        }
      }
    }
    // If the title does not match or is not cached, update the mapping
    this.scopeToDataViewIndexPatternsCache.set(scope, title);
    // Check if the browser fields for this title are already cached
    if (this.dataViewIndexPatternsToBrowserFieldsCache.has(title)) {
      const cachedResult = this.dataViewIndexPatternsToBrowserFieldsCache.get(title);
      if (cachedResult) {
        return cachedResult;
      }
    }
    return undefined;
  }
  /**
   *
   * @param dataView - The dataView containing the fields to be processed.
   * @param scope? - Optional The scope of the data view manager, used to differentiate between different contexts.
   * If passed, will use cache for the specified scope, but can be ignored if caching is not desired.
   * @returns
   */
  public getBrowserFields(
    dataView: DataView,
    scope?: DataViewManagerScopeName
  ): { browserFields: BrowserFields } {
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
      const scopesUsingIndexPatterns = Array.from(this.scopeToDataViewIndexPatternsCache.values());

      if (!scopesUsingIndexPatterns.includes(indexPatterns)) {
        // If no other scope is using this indexPatterns, remove it from the browser fields cache
        this.dataViewIndexPatternsToBrowserFieldsCache.delete(indexPatterns);
      }
    }
  }

  public clearCache(): void {
    this.scopeToDataViewIndexPatternsCache.clear();
    this.dataViewIndexPatternsToBrowserFieldsCache.clear();
  }
}

export const browserFieldsManager = new SecurityBrowserFieldsManager();
