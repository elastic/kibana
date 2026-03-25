/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RenderHookResult } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import type {
  ShowSuppressedAlertsParams,
  ShowSuppressedAlertsResult,
} from './use_show_suppressed_alerts';
import { useShowSuppressedAlerts } from './use_show_suppressed_alerts';
import type { DataTableRecord } from '@kbn/discover-utils';
import { ALERT_SUPPRESSION_DOCS_COUNT } from '@kbn/rule-data-utils';

describe('useShowSuppressedAlerts', () => {
  let hookResult: RenderHookResult<ShowSuppressedAlertsResult, ShowSuppressedAlertsParams>;

  it('should return false if hit has no suppression count field', () => {
    const hit: DataTableRecord = {
      id: 'id',
      raw: {},
      flattened: {},
      isAnchor: false,
    } as unknown as DataTableRecord;
    hookResult = renderHook(() => useShowSuppressedAlerts({ hit }));

    expect(hookResult.result.current).toEqual({ show: false, alertSuppressionCount: 0 });
  });

  it('should return true if hit has the suppression count field', () => {
    const hit: DataTableRecord = {
      id: 'id',
      raw: {},
      flattened: { [ALERT_SUPPRESSION_DOCS_COUNT]: '2' },
      isAnchor: false,
    } as unknown as DataTableRecord;
    hookResult = renderHook(() => useShowSuppressedAlerts({ hit }));

    expect(hookResult.result.current).toEqual({ show: true, alertSuppressionCount: 2 });
  });
});
