/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import React from 'react';
import { useBulkAttackInvestigateInTimelineItems } from './use_bulk_attack_investigate_in_timeline_items';
import { useUserPrivileges } from '../../../../../common/components/user_privileges';
import { useInvestigateInTimeline } from '../../../../../common/hooks/timeline/use_investigate_in_timeline';
import { ALERT_ATTACK_DISCOVERY_ALERT_IDS } from '../constants';

jest.mock('../../../../../common/components/user_privileges');
jest.mock('../../../../../common/hooks/timeline/use_investigate_in_timeline');
jest.mock('../../../../components/alerts_table/actions', () => ({
  buildAlertsKqlFilter: jest.fn().mockReturnValue([]),
}));

const mockUseUserPrivileges = useUserPrivileges as jest.MockedFunction<typeof useUserPrivileges>;
const mockUseInvestigateInTimeline = useInvestigateInTimeline as jest.MockedFunction<
  typeof useInvestigateInTimeline
>;

let queryClient: QueryClient;

function wrapper(props: { children: React.ReactNode }) {
  return React.createElement(QueryClientProvider, { client: queryClient }, props.children);
}

describe('useBulkAttackInvestigateInTimelineItems', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    queryClient = new QueryClient();

    mockUseInvestigateInTimeline.mockReturnValue({
      investigateInTimeline: jest.fn(),
    } as unknown as ReturnType<typeof useInvestigateInTimeline>);

    mockUseUserPrivileges.mockReturnValue({
      timelinePrivileges: { read: true },
    } as unknown as ReturnType<typeof useUserPrivileges>);
  });

  it('should return empty items if timeline read privileges are missing', () => {
    mockUseUserPrivileges.mockReturnValue({
      timelinePrivileges: { read: false },
    } as unknown as ReturnType<typeof useUserPrivileges>);

    const { result } = renderHook(() => useBulkAttackInvestigateInTimelineItems(), { wrapper });
    expect(result.current.items).toEqual([]);
  });

  it('should return one investigate item when user has privileges', () => {
    const { result } = renderHook(() => useBulkAttackInvestigateInTimelineItems(), { wrapper });
    expect(result.current.items).toHaveLength(1);
  });

  it('should call investigateInTimeline on click', async () => {
    const investigateInTimeline = jest.fn();
    const closePopover = jest.fn();
    mockUseInvestigateInTimeline.mockReturnValue({
      investigateInTimeline,
    } as unknown as ReturnType<typeof useInvestigateInTimeline>);

    const { result } = renderHook(() => useBulkAttackInvestigateInTimelineItems({ closePopover }), {
      wrapper,
    });
    await result.current.items[0]?.onClick?.(
      [
        {
          _id: 'attack-1',
          data: [{ field: ALERT_ATTACK_DISCOVERY_ALERT_IDS, value: ['alert-1'] }],
          ecs: { _id: 'attack-1' },
        },
      ],
      false,
      jest.fn(),
      jest.fn(),
      jest.fn()
    );

    expect(investigateInTimeline).toHaveBeenCalledTimes(1);
    expect(closePopover).toHaveBeenCalledTimes(1);
  });

  it('should return empty panels', () => {
    const { result } = renderHook(() => useBulkAttackInvestigateInTimelineItems(), { wrapper });
    expect(result.current.panels).toEqual([]);
  });
});
