/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BrowserFields } from '@kbn/timelines-plugin/common';
import { EMPTY_BROWSER_FIELDS } from '@kbn/timelines-plugin/common';
import type { DataViewSpec } from '@kbn/data-views-plugin/public';

/**
 * Seed value for a security-solution data view entry. Callers spread this and
 * override with fetched field data (and optionally an `error`).
 */
export const initDataView: {
  id: string;
  /** list of active patterns that return data */
  patternList: string[];
  /**
   * title of the Kibana data view; also serves as "all pattern list", including
   * inactive, as a comma separated string
   */
  title: string;
  /**
   * @deprecated determines how we can use the field in the app
   */
  browserFields: BrowserFields;
  fields: DataViewSpec['fields'] | undefined;
  /** set when data view fields are fetched */
  loading: boolean;
  /**
   * @type DataView @kbn/data-views-plugin/common
   */
  dataView: DataViewSpec | undefined;
  error?: unknown;
} = {
  browserFields: EMPTY_BROWSER_FIELDS,
  id: '',
  fields: undefined,
  loading: false,
  patternList: [],
  title: '',
  dataView: undefined,
};
