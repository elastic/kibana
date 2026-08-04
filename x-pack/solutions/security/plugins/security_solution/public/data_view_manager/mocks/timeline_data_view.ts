/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataViewSpec } from '@kbn/data-views-plugin/public';
import type { BrowserFields } from '@kbn/timelines-plugin/common';
import { initDataView } from '@kbn/data-view-manager';
import { mockBrowserFields, mockIndexFields } from '../../common/containers/source/mock';
import {
  DEFAULT_DATA_VIEW_ID,
  DEFAULT_INDEX_PATTERN,
  DEFAULT_SIGNALS_INDEX,
} from '../../../common/constants';

const mockFieldMap: DataViewSpec['fields'] = Object.fromEntries(
  mockIndexFields.map((field) => [field.name, field])
);

/**
 * A data view spec used across the timeline unified components tests, passed as the `spec`
 * argument when constructing a `DataView` (e.g. `new DataView({ spec: mockDataViewSpec })`).
 */
export const mockDataViewSpec = {
  ...initDataView,
  browserFields: mockBrowserFields,
  id: DEFAULT_DATA_VIEW_ID,
  fields: mockFieldMap,
  loading: false,
  patternList: [...DEFAULT_INDEX_PATTERN, `${DEFAULT_SIGNALS_INDEX}-spacename`],
  title: [...DEFAULT_INDEX_PATTERN, `${DEFAULT_SIGNALS_INDEX}-spacename`, 'fakebeat-*'].join(','),
};

/**
 * The default mock browser fields augmented with the `_id` field, used by timeline unified
 * components tests when building column headers.
 */
export const mockBrowserFieldsWithId: BrowserFields = {
  ...mockBrowserFields,
  _id: {
    fields: {
      _id: {
        aggregatable: false,
        esTypes: undefined,
        format: undefined,
        name: '_id',
        searchable: true,
        subType: undefined,
        type: 'string',
      },
    },
  },
};
