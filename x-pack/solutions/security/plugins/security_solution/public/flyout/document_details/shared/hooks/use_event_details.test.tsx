/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RenderHookResult } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import type { UseEventDetailsParams, UseEventDetailsResult } from './use_event_details';
import { getAlertIndexAlias, useEventDetails } from './use_event_details';
import { useSpaceId } from '../../../../common/hooks/use_space_id';
import { useRouteSpy } from '../../../../common/utils/route/use_route_spy';
import { useTimelineEventsDetails } from '../../../../timelines/containers/details';
import { useGetFieldsData } from './use_get_fields_data';

jest.mock('../../../../common/hooks/use_space_id');
jest.mock('../../../../common/utils/route/use_route_spy');
jest.mock('../../../../timelines/containers/details');
jest.mock('./use_get_fields_data');
jest.mock('../../../../common/hooks/use_experimental_features', () => ({
  useIsExperimentalFeatureEnabled: () => true,
}));

const eventId = 'eventId';
const indexName = 'indexName';

describe('getAlertIndexAlias', () => {
  it('should handle default alert index', () => {
    expect(getAlertIndexAlias('.internal.alerts-security.alerts')).toEqual(
      '.alerts-security.alerts-default'
    );
  });

  it('should handle default preview index', () => {
    expect(getAlertIndexAlias('.internal.preview.alerts-security.alerts')).toEqual(
      '.preview.alerts-security.alerts-default'
    );
  });

  it('should handle non default space id', () => {
    expect(getAlertIndexAlias('.internal.preview.alerts-security.alerts', 'test')).toEqual(
      '.preview.alerts-security.alerts-test'
    );
  });
});

describe('useEventDetails', () => {
  let hookResult: RenderHookResult<UseEventDetailsResult, UseEventDetailsParams>;

  it('should return all properties', () => {
    jest.mocked(useSpaceId).mockReturnValue('default');
    (useRouteSpy as jest.Mock).mockReturnValue([{ pageName: 'alerts' }]);
    (useTimelineEventsDetails as jest.Mock).mockReturnValue([false, [], {}, {}, jest.fn()]);
    jest.mocked(useGetFieldsData).mockReturnValue({ getFieldsData: (field: string) => field });

    hookResult = renderHook(() => useEventDetails({ eventId, indexName }));

    // Check if returned value is an object literal
    expect(Object.getPrototypeOf(hookResult.result.current.browserFields)).toEqual(
      Object.prototype
    );
    expect(hookResult.result.current.dataAsNestedObject).toEqual({});
    expect(hookResult.result.current.dataFormattedForFieldBrowser).toEqual([]);
    expect(hookResult.result.current.getFieldsData('test')).toEqual('test');
    expect(hookResult.result.current.loading).toEqual(false);
    expect(hookResult.result.current.refetchFlyoutData()).toEqual(undefined);
    expect(hookResult.result.current.searchHit).toEqual({});
  });
});
