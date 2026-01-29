/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useTimelineEventsDetails } from '../../../timelines/containers/details';
import { useDocumentDetails } from './use_document_details';
import type { DataView } from '@kbn/data-views-plugin/common';
import { createStubDataView } from '@kbn/data-views-plugin/common/data_views/data_view.stub';
import { mockDataFormattedForFieldBrowser } from '../../document_details/shared/mocks/mock_data_formatted_for_field_browser';
import { mockSearchHit } from '../../document_details/shared/mocks/mock_search_hit';
import { mockDataAsNestedObject } from '../../document_details/shared/mocks/mock_data_as_nested_object';
import { useGetFieldsData } from '../../document_details/shared/hooks/use_get_fields_data';

jest.mock('../../../timelines/containers/details');
jest.mock('../../document_details/shared/hooks/use_get_fields_data');

const dataView: DataView = createStubDataView({ spec: {} });
const documentId = 'documentId';

describe('useDocumentDetails', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return all properties', () => {
    (useTimelineEventsDetails as jest.Mock).mockReturnValue([
      true,
      mockDataFormattedForFieldBrowser,
      mockSearchHit,
      mockDataAsNestedObject,
    ]);
    const getFieldsData = jest.fn();
    (useGetFieldsData as jest.Mock).mockReturnValue({ getFieldsData });

    const { result } = renderHook(() =>
      useDocumentDetails({
        dataView,
        documentId,
      })
    );

    expect(result.current.dataAsNestedObject).toBe(mockDataAsNestedObject);
    expect(result.current.dataFormattedForFieldBrowser).toBe(mockDataFormattedForFieldBrowser);
    expect(result.current.getFieldsData).toBe(getFieldsData);
    expect(result.current.loading).toBe(true);
  });
});
