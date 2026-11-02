/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getDataStreamNamespaceFilter } from './get_data_stream_namespace_filter';
import { uiSettingsServiceMock } from '@kbn/core/public/mocks';

const uiSettingsClientMock = uiSettingsServiceMock.create().setup();
describe('getDataStreamNamespaceFilter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return empty array if ui settings is null or undefined', async () => {
    uiSettingsClientMock.get.mockResolvedValueOnce(null);
    const filters = await getDataStreamNamespaceFilter({
      uiSettingsClient: uiSettingsClientMock,
    });
    expect(filters).toEqual([]);

    uiSettingsClientMock.get.mockResolvedValueOnce(undefined);
    const filters2 = await getDataStreamNamespaceFilter({
      uiSettingsClient: uiSettingsClientMock,
    });
    expect(filters2).toEqual([]);
  });

  it('should return empty array if terms array is empty', async () => {
    const emptyFilter = [] as String[];
    uiSettingsClientMock.get.mockResolvedValueOnce(emptyFilter);
    const filters = await getDataStreamNamespaceFilter({
      uiSettingsClient: uiSettingsClientMock,
    });
    expect(filters).toEqual([]);
  });

  it('should return filters array if ui settings populated with single value', async () => {
    const filterConfig = ['namespace1'];
    const expected = {
      meta: { negate: false },
      query: {
        bool: {
          filter: {
            terms: {
              'data_stream.namespace': ['namespace1'],
            },
          },
        },
      },
    };
    uiSettingsClientMock.get.mockResolvedValueOnce(filterConfig);
    const filters = await getDataStreamNamespaceFilter({
      uiSettingsClient: uiSettingsClientMock,
    });

    expect(filters).toEqual([expected]);
  });

  it('should return filters array if ui settings populated with multiple values', async () => {
    const filterConfig = ['namespace1', 'namespace2'];
    const expected = {
      meta: { negate: false },
      query: {
        bool: {
          filter: {
            terms: {
              'data_stream.namespace': ['namespace1', 'namespace2'],
            },
          },
        },
      },
    };
    uiSettingsClientMock.get.mockResolvedValueOnce(filterConfig);
    const filters = await getDataStreamNamespaceFilter({
      uiSettingsClient: uiSettingsClientMock,
    });

    expect(filters).toEqual([expected]);
  });

  it('should handle already parsed filter object', async () => {
    const filterConfig = ['namespace1'];
    const expected = {
      meta: { negate: false },
      query: {
        bool: {
          filter: {
            terms: {
              'data_stream.namespace': ['namespace1'],
            },
          },
        },
      },
    };
    uiSettingsClientMock.get.mockResolvedValueOnce(filterConfig);
    const filters = await getDataStreamNamespaceFilter({
      uiSettingsClient: uiSettingsClientMock,
    });

    expect(filters).toEqual([expected]);
  });

  it('returns an empty array of filters if filter structure is invalid', async () => {
    const invalidFilter = 'not-an-array';
    uiSettingsClientMock.get.mockResolvedValueOnce(invalidFilter);

    const filters = await getDataStreamNamespaceFilter({
      uiSettingsClient: uiSettingsClientMock,
    });
    // Should return empty array when structure is invalid but not throw
    expect(filters).toEqual([]);
  });
});
