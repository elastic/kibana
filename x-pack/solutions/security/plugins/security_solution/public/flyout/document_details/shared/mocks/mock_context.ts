/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockBrowserFields } from './mock_browser_fields';
import { mockSearchHit } from './mock_search_hit';
import { mockDataFormattedForFieldBrowser } from './mock_data_formatted_for_field_browser';
import { mockGetFieldsData } from './mock_get_fields_data';
import { mockDataAsNestedObject } from './mock_data_as_nested_object';
import type { DocumentDetailsContext } from '../context';

/**
 * Mock contextValue for left panel context
 */
export const mockContextValue: DocumentDetailsContext = {
  eventId: 'eventId',
  indexName: 'index',
  scopeId: 'scopeId',
  getFieldsData: mockGetFieldsData,
  dataFormattedForFieldBrowser: mockDataFormattedForFieldBrowser,
  browserFields: mockBrowserFields,
  dataAsNestedObject: mockDataAsNestedObject,
  searchHit: mockSearchHit,
  investigationFields: [],
  refetchFlyoutData: jest.fn(),
  isPreview: false,
  isPreviewMode: false,
};
