/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BrowserFields } from '@kbn/timelines-plugin/common';
import type { DataView } from '@kbn/data-views-plugin/public';
import { getCategory } from '@kbn/response-ops-alerts-fields-browser/helpers';

interface BrowserFieldsResult {
  browserFields: BrowserFields;
}

// NOTE:for referential comparison optimization
const emptyBrowserFields = {};

/**
 * SecurityBrowserFieldsManager is a singleton class that manages the browser fields
 * for the Security Solution. It previously used a cache to store browser fields for
 * different data views, but this was removed as the limiting factor was no longer building the browserfields
 * but rather any http queries needed to fetch the fields.
 */
class SecurityBrowserFieldsManager {
  private static instance: SecurityBrowserFieldsManager;
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

    return this.buildBrowserFields(fields);
  }
}

export const browserFieldsManager = new SecurityBrowserFieldsManager();
