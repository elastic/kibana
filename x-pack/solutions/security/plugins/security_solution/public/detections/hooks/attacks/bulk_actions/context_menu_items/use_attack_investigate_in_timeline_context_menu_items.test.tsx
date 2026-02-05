/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useAttackInvestigateInTimelineContextMenuItems } from './use_attack_investigate_in_timeline_context_menu_items';
import { getMockAttackDiscoveryAlerts } from '../../../../../attack_discovery/pages/mock/mock_attack_discovery_alerts';
import { useUserPrivileges } from '../../../../../common/components/user_privileges';
import { useInvestigateInTimeline } from '../../../../../common/hooks/timeline/use_investigate_in_timeline';

jest.mock('../../../../../common/components/user_privileges');
jest.mock('../../../../../common/hooks/timeline/use_investigate_in_timeline');
jest.mock('../../../../components/alerts_table/actions', () => ({
  buildAlertsKqlFilter: jest.fn().mockReturnValue([]),
}));

const mockUseUserPrivileges = useUserPrivileges as jest.MockedFunction<typeof useUserPrivileges>;
const mockUseInvestigateInTimeline = useInvestigateInTimeline as jest.MockedFunction<
  typeof useInvestigateInTimeline
>;

const mockAttack = getMockAttackDiscoveryAlerts()[0];

describe('useAttackInvestigateInTimelineContextMenuItems', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockUseInvestigateInTimeline.mockReturnValue({
      investigateInTimeline: jest.fn(),
    } as unknown as ReturnType<typeof useInvestigateInTimeline>);

    mockUseUserPrivileges.mockReturnValue({
      timelinePrivileges: { read: true },
    } as unknown as ReturnType<typeof useUserPrivileges>);
  });

  it('should NOT return items if timeline read privileges are missing', () => {
    mockUseUserPrivileges.mockReturnValue({
      timelinePrivileges: { read: false },
    } as unknown as ReturnType<typeof useUserPrivileges>);

    const { result } = renderHook(() =>
      useAttackInvestigateInTimelineContextMenuItems({
        attack: mockAttack,
      })
    );

    expect(result.current.items).toEqual([]);
  });

  it('should return one item matching the snapshot', () => {
    const { result } = renderHook(() =>
      useAttackInvestigateInTimelineContextMenuItems({
        attack: mockAttack,
      })
    );

    expect(result.current.items).toMatchInlineSnapshot(`
      Array [
        Object {
          "data-test-subj": "attack-investigate-in-timeline-action-item",
          "key": "attack-investigate-in-timeline-action-item",
          "name": "Investigate in timeline",
          "onClick": [Function],
        },
      ]
    `);
  });

  it('should call `closePopover` on click', () => {
    const closePopover = jest.fn();
    const { result } = renderHook(() =>
      useAttackInvestigateInTimelineContextMenuItems({
        attack: mockAttack,
        closePopover,
      })
    );

    result.current.items[0]?.onClick?.({} as React.MouseEvent);
    expect(closePopover).toHaveBeenCalledTimes(1);
  });

  it('should call `investigateInTimeline` on click', () => {
    const investigateInTimeline = jest.fn();
    mockUseInvestigateInTimeline.mockReturnValue({
      investigateInTimeline,
    } as unknown as ReturnType<typeof useInvestigateInTimeline>);
    const { result } = renderHook(() =>
      useAttackInvestigateInTimelineContextMenuItems({
        attack: mockAttack,
      })
    );

    result.current.items[0]?.onClick?.({} as React.MouseEvent);
    expect(investigateInTimeline).toHaveBeenCalledTimes(1);
  });
});
