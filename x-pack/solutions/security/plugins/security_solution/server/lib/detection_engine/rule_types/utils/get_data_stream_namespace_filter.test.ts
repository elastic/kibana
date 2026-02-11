/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getDataStreamNamespaceFilter } from './get_data_stream_namespace_filter';
import type { IUiSettingsClient } from '@kbn/core/server';

const uiSettingsClientMock = {
  get: jest.fn(),
} as unknown as IUiSettingsClient;

describe('getDataStreamNamespaceFilter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return empty array if ui settings is null or undefined', async () => {
    (uiSettingsClientMock.get as jest.Mock).mockResolvedValueOnce(null);
    const filters = await getDataStreamNamespaceFilter({
      uiSettingsClient: uiSettingsClientMock,
    });
    expect(filters).toEqual([]);

    (uiSettingsClientMock.get as jest.Mock).mockResolvedValueOnce(undefined);
    const filters2 = await getDataStreamNamespaceFilter({
      uiSettingsClient: uiSettingsClientMock,
    });
    expect(filters2).toEqual([]);
  });

  it('should return empty array if terms array is empty', async () => {
    const emptyFilter = {
      meta: { negate: false },
      query: {
        bool: {
          filter: {
            terms: {
              'data_stream.namespace': [],
            },
          },
        },
      },
    };
    (uiSettingsClientMock.get as jest.Mock).mockResolvedValueOnce(JSON.stringify(emptyFilter));
    const filters = await getDataStreamNamespaceFilter({
      uiSettingsClient: uiSettingsClientMock,
    });
    expect(filters).toEqual([]);
  });

  it('should return filters array if ui settings populated with single value', async () => {
    const filterConfig = {
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
    (uiSettingsClientMock.get as jest.Mock).mockResolvedValueOnce(JSON.stringify(filterConfig));
    const filters = await getDataStreamNamespaceFilter({
      uiSettingsClient: uiSettingsClientMock,
    });

    expect(filters).toEqual([filterConfig]);
  });

  it('should return filters array if ui settings populated with multiple values', async () => {
    const filterConfig = {
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
    (uiSettingsClientMock.get as jest.Mock).mockResolvedValueOnce(JSON.stringify(filterConfig));
    const filters = await getDataStreamNamespaceFilter({
      uiSettingsClient: uiSettingsClientMock,
    });

    expect(filters).toEqual([filterConfig]);
  });

  it('should handle already parsed filter object', async () => {
    const filterConfig = {
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
    (uiSettingsClientMock.get as jest.Mock).mockResolvedValueOnce(filterConfig);
    const filters = await getDataStreamNamespaceFilter({
      uiSettingsClient: uiSettingsClientMock,
    });

    expect(filters).toEqual([filterConfig]);
  });

  it('should throw error if JSON parsing fails', async () => {
    (uiSettingsClientMock.get as jest.Mock).mockResolvedValueOnce('invalid json{');

    await expect(
      getDataStreamNamespaceFilter({
        uiSettingsClient: uiSettingsClientMock,
      })
    ).rejects.toThrow(
      'The advanced setting "Include data stream namespaces in rule execution" is incorrectly formatted'
    );
  });

  it('should throw error if filter structure is invalid', async () => {
    const invalidFilter = {
      meta: { negate: false },
      query: {
        bool: {
          filter: {
            terms: {
              'data_stream.namespace': 'not-an-array',
            },
          },
        },
      },
    };
    (uiSettingsClientMock.get as jest.Mock).mockResolvedValueOnce(JSON.stringify(invalidFilter));

    const filters = await getDataStreamNamespaceFilter({
      uiSettingsClient: uiSettingsClientMock,
    });
    // Should return empty array when structure is invalid but not throw
    expect(filters).toEqual([]);
  });
});
