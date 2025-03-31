/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { TestProviders } from '../../common/mock';
import { useBrowserFields } from './use_browser_fields';
import { DEFAULT_SECURITY_SOLUTION_DATA_VIEW_ID, DataViewManagerScopeName } from '../constants';
import { useDataView } from './use_data_view';
import { type FieldSpec } from '@kbn/data-views-plugin/common';

jest.mock('./use_data_view', () => ({
  useDataView: jest.fn(),
}));

describe('useBrowserFields', () => {
  beforeAll(() => {
    jest.mocked(useDataView).mockReturnValue({
      dataView: {
        id: DEFAULT_SECURITY_SOLUTION_DATA_VIEW_ID,
        fields: {
          '@timestamp': {
            type: 'date',
            name: '@timestamp',
          } as FieldSpec,
        },
      },
      status: 'ready',
    });
  });

  it('should call the useDataView hook and return browser fields map', () => {
    const wrapper = renderHook(() => useBrowserFields(DataViewManagerScopeName.default), {
      wrapper: TestProviders,
    });

    expect(wrapper.result.current).toMatchInlineSnapshot(`
      Object {
        "base": Object {
          "fields": Object {
            "@timestamp": Object {
              "name": "@timestamp",
              "type": "date",
            },
          },
        },
      }
    `);
  });
});
