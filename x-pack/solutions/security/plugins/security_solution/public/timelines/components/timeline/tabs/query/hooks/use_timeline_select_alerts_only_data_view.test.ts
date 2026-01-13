/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useTimelineSelectAlertsOnlyDataView } from './use_timeline_select_alerts_only_data_view';
import { useSelectDataView } from '../../../../../../data_view_manager/hooks/use_select_data_view';
import { useSpaceId } from '../../../../../../common/hooks/use_space_id';
import { DEFAULT_ALERT_DATA_VIEW_ID } from '../../../../../../../common/constants';
import { PageScope } from '../../../../../../data_view_manager/constants';

jest.mock('../../../../../../data_view_manager/hooks/use_select_data_view');
jest.mock('../../../../../../common/hooks/use_space_id');

describe('useTimelineSelectAlertsOnlyDataView', () => {
  it('should call the callback with the correct values', () => {
    const selectDataView = jest.fn();
    (useSelectDataView as jest.Mock).mockReturnValue(selectDataView);

    const spaceId = 'default';
    (useSpaceId as jest.Mock).mockReturnValue(spaceId);

    const { result } = renderHook(() => useTimelineSelectAlertsOnlyDataView());

    result.current();

    expect(selectDataView).toHaveBeenCalledWith({
      id: `${DEFAULT_ALERT_DATA_VIEW_ID}-${spaceId}`,
      scope: PageScope.timeline,
    });
  });
});
