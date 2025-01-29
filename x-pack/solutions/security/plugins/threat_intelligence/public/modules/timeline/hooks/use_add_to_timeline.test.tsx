/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EMPTY_VALUE } from '../../../constants/common';
import { renderHook, RenderHookResult } from '@testing-library/react';
import {
  generateMockIndicator,
  generateMockUrlIndicator,
  Indicator,
} from '../../../../common/types/indicator';
import { TestProvidersComponent } from '../../../mocks/test_providers';
import { useAddToTimeline, UseAddToTimelineValue } from './use_add_to_timeline';

describe('useInvestigateInTimeline()', () => {
  let hookResult: RenderHookResult<UseAddToTimelineValue, unknown>;

  xit('should return empty object if Indicator is incorrect', () => {
    const indicator: Indicator = generateMockIndicator();
    indicator.fields['threat.indicator.name'] = ['wrong'];
    const field = 'threat.indicator.name';

    hookResult = renderHook(() => useAddToTimeline({ indicator, field }), {
      wrapper: TestProvidersComponent,
    });
    expect(hookResult.result.current).toEqual({});
  });

  it(`should return empty object if indicator string is ${EMPTY_VALUE}`, () => {
    const indicator: string = EMPTY_VALUE;
    const field = 'threat.indicator.ip';

    hookResult = renderHook(() => useAddToTimeline({ indicator, field }), {
      wrapper: TestProvidersComponent,
    });
    expect(hookResult.result.current).toEqual({});
  });

  xit('should return empty object if field is incorrect', () => {
    const indicator: Indicator = generateMockIndicator();
    const field = 'abc';

    hookResult = renderHook(() => useAddToTimeline({ indicator, field }), {
      wrapper: TestProvidersComponent,
    });
    expect(hookResult.result.current).toEqual({});
  });

  xit('should return addToTimelineProps', () => {
    const indicator: Indicator = generateMockUrlIndicator();
    const field = 'threat.indicator.ip';

    hookResult = renderHook(() => useAddToTimeline({ indicator, field }), {
      wrapper: TestProvidersComponent,
    });

    expect(hookResult.result.current).toHaveProperty('addToTimelineProps');
  });
});
