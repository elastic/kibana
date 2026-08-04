/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { DataView } from '@kbn/data-views-plugin/common';
import { useBrowserFields } from './use_browser_fields';
import { DEFAULT_SECURITY_SOLUTION_DATA_VIEW_ID } from '@kbn/data-view-manager';

const buildDataView = () =>
  new DataView({
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
  });

describe('useBrowserFields', () => {
  it('should return browser fields map built from the provided dataView', () => {
    const wrapper = renderHook(() => useBrowserFields(buildDataView()));

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

  it('should return empty browser fields when no dataView is provided', () => {
    const wrapper = renderHook(() => useBrowserFields(undefined as unknown as DataView));

    expect(wrapper.result.current).toEqual({});
  });
});
