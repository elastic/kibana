/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataViewSpec } from '@kbn/data-views-plugin/public';
import type { SelectedDataView } from '../store/model';
import { initDataView, initSourcererScope } from '../store/model';
import { mockBrowserFields, mockIndexFields } from '../../common/containers/source/mock';
import {
  DEFAULT_DATA_VIEW_ID,
  DEFAULT_INDEX_PATTERN,
  DEFAULT_SIGNALS_INDEX,
} from '../../../common/constants';

export const mockPatterns = [
  'auditbeat-*',
  'endgame-*',
  'filebeat-*',
  'logs-*',
  'packetbeat-*',
  'winlogbeat-*',
  'journalbeat-*',
];

const mockFieldMap: DataViewSpec['fields'] = Object.fromEntries(
  mockIndexFields.map((field) => [field.name, field])
);

const mockDefaultDataView = {
  ...initDataView,
  browserFields: mockBrowserFields,
  id: DEFAULT_DATA_VIEW_ID,
  fields: mockFieldMap,
  loading: false,
  patternList: [...DEFAULT_INDEX_PATTERN, `${DEFAULT_SIGNALS_INDEX}-spacename`],
  title: [...DEFAULT_INDEX_PATTERN, `${DEFAULT_SIGNALS_INDEX}-spacename`, 'fakebeat-*'].join(','),
};

export const mockSourcererScope: SelectedDataView = {
  ...initSourcererScope,
  browserFields: {
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
  },
  sourcererDataView: mockDefaultDataView,
  selectedPatterns: mockPatterns,
  indicesExist: true,
  loading: false,
  dataViewId: mockDefaultDataView.id,
};
