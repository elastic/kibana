/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RenderHookResult } from '@testing-library/react';
import { renderHook } from '@testing-library/react';

import type {
  ShowRelatedAlertsBySameSourceEventParams,
  ShowRelatedAlertsBySameSourceEventResult,
} from './use_show_related_alerts_by_same_source_event';
import { useShowRelatedAlertsBySameSourceEvent } from './use_show_related_alerts_by_same_source_event';
import type { DataTableRecord } from '@kbn/discover-utils';
import { ALERT_ANCESTORS_ID } from '../../../../../../common/field_maps/field_names';

describe('useShowRelatedAlertsBySameSourceEvent', () => {
  let hookResult: RenderHookResult<
    ShowRelatedAlertsBySameSourceEventResult,
    ShowRelatedAlertsBySameSourceEventParams
  >;

  it('should return hit.id if ancestors field is not present', () => {
    const hit: DataTableRecord = {
      id: 'eventId',
      raw: { _id: 'eventId' },
      flattened: {},
      isAnchor: false,
    } as unknown as DataTableRecord;
    hookResult = renderHook(() => useShowRelatedAlertsBySameSourceEvent({ hit }));

    expect(hookResult.result.current).toEqual({ show: true, originalEventId: 'eventId' });
  });

  it('should return true if hit has the correct ancestors field', () => {
    const hit: DataTableRecord = {
      id: 'eventId',
      raw: { _id: 'eventId' },
      flattened: { [ALERT_ANCESTORS_ID]: 'original_event' },
      isAnchor: false,
    } as unknown as DataTableRecord;
    hookResult = renderHook(() => useShowRelatedAlertsBySameSourceEvent({ hit }));

    expect(hookResult.result.current).toEqual({ show: true, originalEventId: 'original_event' });
  });
});
