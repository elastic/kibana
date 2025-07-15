/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DataView } from '@kbn/data-plugin/common';
import { fieldFormatsMock } from '@kbn/field-formats-plugin/common/mocks';
import type { FieldFormatsStartCommon } from '@kbn/field-formats-plugin/common';
import { DEFAULT_SECURITY_SOLUTION_DATA_VIEW_ID } from '../constants';

export const getMockDataView = (fieldFormats: FieldFormatsStartCommon = fieldFormatsMock) =>
  new DataView({
    spec: {
      id: DEFAULT_SECURITY_SOLUTION_DATA_VIEW_ID,
      fields: {
        'host.name': {
          name: 'host.name',
          type: 'keyword',
          searchable: true,
          aggregatable: true,
        },
        'source.ip': {
          name: 'source.ip',
          type: 'keyword',
          searchable: true,
          aggregatable: true,
        },
        attrName: {
          name: 'attrName',
          type: 'keyword',
          searchable: true,
          aggregatable: true,
        },
      },
    },
    fieldFormats,
  });

export const getMockDataViewWithMatchedIndices = (
  matchedIndices: string[] = ['test'],
  fieldFormats?: FieldFormatsStartCommon
) => {
  const dataView = getMockDataView(fieldFormats);
  dataView.matchedIndices = matchedIndices;
  dataView.setIndexPattern(matchedIndices.join(','));

  return dataView;
};
