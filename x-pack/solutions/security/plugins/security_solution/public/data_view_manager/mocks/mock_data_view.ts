/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataViewFieldMap } from '@kbn/data-plugin/common';
import { DataView } from '@kbn/data-plugin/common';
import { fieldFormatsMock } from '@kbn/field-formats-plugin/common/mocks';
import type { FieldFormat, FieldFormatsStartCommon } from '@kbn/field-formats-plugin/common';
import { DEFAULT_SECURITY_SOLUTION_DATA_VIEW_ID } from '../constants';
import { mockIndexFieldsByName } from '../../common/containers/source/mock';

export const getMockDataView = (fieldFormats: FieldFormatsStartCommon = fieldFormatsMock) =>
  new DataView({
    spec: {
      id: DEFAULT_SECURITY_SOLUTION_DATA_VIEW_ID,
      fields: mockIndexFieldsByName as DataViewFieldMap,
    },
    fieldFormats: {
      ...fieldFormats,
      getDefaultInstance: () => ({ toJSON: () => {}, convert: () => {} } as unknown as FieldFormat),
    },
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
