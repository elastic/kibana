/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RenderHookResult } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import type { UseSessionViewConfigParams } from './use_session_view_config';
import { useSessionViewConfig } from './use_session_view_config';
import type { SessionViewConfig } from '../../../../../common/types/session_view';
import type { GetFieldsData } from './use_get_fields_data';
import { mockDataFormattedForFieldBrowser } from '../mocks/mock_data_formatted_for_field_browser';
import { mockFieldData, mockGetFieldsData } from '../mocks/mock_get_fields_data';

describe('useSessionViewConfig', () => {
  let hookResult: RenderHookResult<SessionViewConfig | null, UseSessionViewConfigParams>;

  it(`should return a session view config object if alert ancestor index is available`, () => {
    const getFieldsData: GetFieldsData = (field: string) => {
      if (field === 'kibana.alert.ancestors.index') {
        return field;
      }
      return mockFieldData[field];
    };

    const dataFormattedForFieldBrowser = [
      ...mockDataFormattedForFieldBrowser,
      {
        category: '_id',
        field: '_id',
        values: ['id'],
        originalValue: ['id'],
        isObjectArray: false,
      },
    ];

    hookResult = renderHook((props: UseSessionViewConfigParams) => useSessionViewConfig(props), {
      initialProps: {
        getFieldsData,
        dataFormattedForFieldBrowser,
      },
    });

    expect(hookResult.result.current).toEqual({
      index: 'kibana.alert.ancestors.index',
      investigatedAlertId: '_id',
      jumpToCursor: '2023-01-01T00:00:00.000Z',
      jumpToEntityId: 'process.entity_id',
      sessionEntityId: 'process.entry_leader.entity_id',
      sessionStartTime: 'process.entry_leader.start',
    });
  });

  it(`should return a session view config object with document _index if alert ancestor index is not available`, () => {
    const dataFormattedForFieldBrowser = [
      ...mockDataFormattedForFieldBrowser,
      {
        category: '_id',
        field: '_id',
        values: ['id'],
        originalValue: ['id'],
        isObjectArray: false,
      },
      {
        category: '_index',
        field: '_index',
        values: ['.some-index'],
        originalValue: ['.some-index'],
        isObjectArray: false,
      },
    ];
    hookResult = renderHook((props: UseSessionViewConfigParams) => useSessionViewConfig(props), {
      initialProps: {
        getFieldsData: mockGetFieldsData,
        dataFormattedForFieldBrowser,
      },
    });

    expect(hookResult.result.current).toEqual({
      index: 'index',
      investigatedAlertId: '_id',
      jumpToCursor: '2023-01-01T00:00:00.000Z',
      jumpToEntityId: 'process.entity_id',
      sessionEntityId: 'process.entry_leader.entity_id',
      sessionStartTime: 'process.entry_leader.start',
    });
  });

  it(`should return null if data isn't ready for session view`, () => {
    const getFieldsData: GetFieldsData = (field: string) => '';

    hookResult = renderHook((props: UseSessionViewConfigParams) => useSessionViewConfig(props), {
      initialProps: {
        getFieldsData,
        dataFormattedForFieldBrowser: mockDataFormattedForFieldBrowser,
      },
    });

    expect(hookResult.result.current).toEqual(null);
  });
});
