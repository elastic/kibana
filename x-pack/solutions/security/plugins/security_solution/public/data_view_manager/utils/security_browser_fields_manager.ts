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
  private fieldBrowserCache = new Map<
    DataViewManagerScopeName,
    Record<DataViewTitle, { browserFields: BrowserFields }>
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
    if (!fields || fields.length === 0) {
      return { browserFields: {} };
    }

    const title = dataView.getIndexPattern();

    // Caching path
    if (scope) {
      const cachedResult = this.fieldBrowserCache.get(scope);
      // Confirm if the cache exists and matches the current dataView for the scope
      // The dataView.id is consistent even if the patterns change, so we use the title (index pattern) as the key
      if (cachedResult && cachedResult[title]) {
        return cachedResult[title];
      }

      // If the index patterns (title) for the dataView have changed or is not cached, build the browser fields
      const result = this.buildBrowserFields(fields);
      this.fieldBrowserCache.set(scope, { [title]: result });
      return result;
    } else {
      // non-caching path

      const result = this.buildBrowserFields(fields);
      return result;
    }
  }

  public removeFromCache(scope: DataViewManagerScopeName): void {
    this.fieldBrowserCache.delete(scope);
  }

  public clearCache(): void {
    this.fieldBrowserCache.clear();
  }
}

export const browserFieldsManager = new SecurityBrowserFieldsManager();
