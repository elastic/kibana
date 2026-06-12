/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { TestProviders } from '../../common/mock';
import { useBrowserFields } from './use_browser_fields';
import { DEFAULT_SECURITY_SOLUTION_DATA_VIEW_ID, PageScope } from '../constants';
import { useDataView } from './use_data_view';
import { DataView } from '@kbn/data-views-plugin/common';
import { useIsExperimentalFeatureEnabled } from '../../common/hooks/use_experimental_features';

jest.mock('../../common/hooks/use_experimental_features');

jest.mock('./use_data_view', () => ({
  useDataView: jest.fn(),
}));

describe('useBrowserFields', () => {
  beforeAll(() => {
    jest.mocked(useDataView).mockReturnValue({
      dataView: new DataView({
        spec: {
          id: DEFAULT_SECURITY_SOLUTION_DATA_VIEW_ID,
          title: 'security-solution-data-view',
          fields: {
            '@timestamp': {
              name: '@timestamp',
              type: 'date',
              esTypes: ['date'],
              aggregatable: true,
              searchable: true,
              scripted: false,
            },
          },
        },
        // @ts-expect-error: DataView constructor expects more, but this is enough for our test
        fieldFormats: { getDefaultInstance: () => ({}) },
      }),
      status: 'ready',
    });
  });

  it('should call the useDataView hook and return browser fields map', () => {
    jest.mocked(useIsExperimentalFeatureEnabled).mockReturnValue(true);
    const wrapper = renderHook(() => useBrowserFields(PageScope.default), {
      wrapper: TestProviders,
    });

    expect(wrapper.result.current).toMatchInlineSnapshot(`
      Object {
        "base": Object {
          "fields": Object {
            "@timestamp": Object {
              "aggregatable": true,
              "esTypes": Array [
                "date",
              ],
              "name": "@timestamp",
              "scripted": false,
              "searchable": true,
              "shortDotsEnable": false,
              "type": "date",
            },
          },
        },
      }
    `);
  });
});
