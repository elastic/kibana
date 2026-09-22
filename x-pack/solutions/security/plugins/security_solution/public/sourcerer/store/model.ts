/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BrowserFields } from '@kbn/timelines-plugin/common';
import { EMPTY_BROWSER_FIELDS } from '@kbn/timelines-plugin/common';
import type { DataViewSpec } from '@kbn/data-views-plugin/public';
import type { PageScope } from '../../data_view_manager/constants';

/**
 * DataView from Kibana + timelines/index_fields enhanced field data
 */
export interface SourcererDataView {
  /** Uniquely identifies a Kibana Data View */
  id: string;
  /**  list of active patterns that return data  */
  patternList: string[];
  /**
   * title of Kibana Data View
   * title also serves as "all pattern list", including inactive
   * comma separated string
   */
  title: string;
  /**
   * @deprecated
   * determines how we can use the field in the app
   * aggregatable, searchable, type, example
   * category, description, format
   * indices the field is included in etc*/
  browserFields: BrowserFields;
  fields: DataViewSpec['fields'] | undefined;
  /** set when data view fields are fetched */
  loading: boolean;
  /**
   * @type DataView @kbn/data-views-plugin/common
   */
  dataView: DataViewSpec | undefined;
}

/**
 * Combined data from a Kibana data view and its selected patterns to create
 * selected data view state
 */
export interface SelectedDataView {
  /**
   * @deprecated use EcsFlat or fields / indexFields from data view
   */
  browserFields: BrowserFields;
  dataViewId: string | null; // null if legacy pre-8.0 timeline
  /** do the selected indices exist  */
  indicesExist: boolean;
  /** is an update being made to the data view */
  loading: boolean;
  /* all selected patterns */
  selectedPatterns: string[];
  /**
   * Easier to add this additional data rather than
   * try to extend the SelectedDataView type from DataView.
   */
  sourcererDataView: DataViewSpec;
}

export type SourcererUrlState = Partial<{
  [id in PageScope]: {
    id: string;
    selectedPatterns: string[];
  };
}>;

export const initDataView: SourcererDataView & { id: string; error?: unknown } = {
  browserFields: EMPTY_BROWSER_FIELDS,
  id: '',
  fields: undefined,
  loading: false,
  patternList: [],
  title: '',
  dataView: undefined,
};
