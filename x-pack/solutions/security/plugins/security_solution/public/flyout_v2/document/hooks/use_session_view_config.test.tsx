/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RenderHookResult } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import type { DataTableRecord, EsHitRecord } from '@kbn/discover-utils';
import { useSessionViewConfig } from './use_session_view_config';
import type { SessionViewConfig } from '../../../../common/types/session_view';

const createHit = ({
  flattened,
  id = '_id',
  index = 'index',
}: {
  flattened: Record<string, unknown>;
  id?: string;
  index?: string;
}): DataTableRecord => ({
  id,
  raw: {
    _id: id,
    _index: index,
  } as EsHitRecord,
  flattened,
});

describe('useSessionViewConfig', () => {
  let hookResult: RenderHookResult<SessionViewConfig | null, DataTableRecord>;

  it(`should return a session view config object if alert ancestor index is available`, () => {
    const hit = createHit({
      flattened: {
        'kibana.alert.ancestors.index': ['kibana.alert.ancestors.index'],
        'kibana.alert.original_time': ['2023-01-01T00:00:00.000Z'],
        'process.entity_id': ['process.entity_id'],
        'process.entry_leader.entity_id': ['process.entry_leader.entity_id'],
        'process.entry_leader.start': ['process.entry_leader.start'],
      },
    });

    hookResult = renderHook((props: DataTableRecord) => useSessionViewConfig(props), {
      initialProps: hit,
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
    const hit = createHit({
      index: '.some-index',
      flattened: {
        timestamp: ['2023-01-01T00:00:00.000Z'],
        'process.entity_id': ['process.entity_id'],
        'process.entry_leader.entity_id': ['process.entry_leader.entity_id'],
        'process.entry_leader.start': ['process.entry_leader.start'],
      },
    });
    hookResult = renderHook((props: DataTableRecord) => useSessionViewConfig(props), {
      initialProps: hit,
    });

    expect(hookResult.result.current).toEqual({
      index: '.some-index',
      investigatedAlertId: '_id',
      jumpToCursor: '2023-01-01T00:00:00.000Z',
      jumpToEntityId: 'process.entity_id',
      sessionEntityId: 'process.entry_leader.entity_id',
      sessionStartTime: 'process.entry_leader.start',
    });
  });

  it(`should return null if data isn't ready for session view`, () => {
    const hit = createHit({
      flattened: {},
    });

    hookResult = renderHook((props: DataTableRecord) => useSessionViewConfig(props), {
      initialProps: hit,
    });

    expect(hookResult.result.current).toEqual(null);
  });
});
