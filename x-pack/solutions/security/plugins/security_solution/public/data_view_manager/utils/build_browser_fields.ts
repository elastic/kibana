/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BrowserFields } from '@kbn/timelines-plugin/common';
import type { DataView } from '@kbn/data-views-plugin/public';
import { getCategory } from '@kbn/response-ops-alerts-fields-browser/helpers';

// NOTE:for referential comparison optimization
const emptyBrowserFields = {};

export const buildBrowserFields = (fields: DataView['fields']): BrowserFields => {
  if (fields == null || !fields.length) return emptyBrowserFields;

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

  return browserFields;
};
