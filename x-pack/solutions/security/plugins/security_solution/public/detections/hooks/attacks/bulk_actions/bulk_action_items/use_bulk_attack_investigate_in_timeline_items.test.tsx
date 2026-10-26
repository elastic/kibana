/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import React from 'react';
import { TIMESTAMP } from '@kbn/rule-data-utils';
import { useBulkAttackInvestigateInTimelineItems } from './use_bulk_attack_investigate_in_timeline_items';
import { useUserPrivileges } from '../../../../../common/components/user_privileges';
import { useInvestigateInTimeline } from '../../../../../common/hooks/timeline/use_investigate_in_timeline';
import { ALERT_ATTACK_DISCOVERY_ALERT_IDS } from '../constants';
import { useKibana } from '../../../../../common/lib/kibana';
import { AttacksEventTypes } from '../../../../../common/lib/telemetry';

jest.mock('../../../../../common/components/user_privileges');
jest.mock('../../../../../common/hooks/timeline/use_investigate_in_timeline');
jest.mock('../../../../components/alerts_table/actions', () => ({
  buildAlertsKqlFilter: jest.fn().mockReturnValue([]),
}));
jest.mock('../../../../../common/lib/kibana');

const mockUseUserPrivileges = useUserPrivileges as jest.MockedFunction<typeof useUserPrivileges>;
const mockUseInvestigateInTimeline = useInvestigateInTimeline as jest.MockedFunction<
  typeof useInvestigateInTimeline
>;

const reportEventMock = jest.fn();
(useKibana as jest.Mock).mockReturnValue({
  services: {
    telemetry: {
      reportEvent: reportEventMock,
    },
  },
});

let queryClient: QueryClient;

function wrapper(props: { children: React.ReactNode }) {
  return React.createElement(QueryClientProvider, { client: queryClient }, props.children);
}

describe('useBulkAttackInvestigateInTimelineItems', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    reportEventMock.mockClear();
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

  it('opens timeline on a range wide enough to hold the alerts behind every selected attack', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2024-05-02T12:00:00.000Z'));

    const investigateInTimeline = jest.fn();
    mockUseInvestigateInTimeline.mockReturnValue({
      investigateInTimeline,
    } as unknown as ReturnType<typeof useInvestigateInTimeline>);

    const { result } = renderHook(() => useBulkAttackInvestigateInTimelineItems(), { wrapper });
    await result.current.items[0]?.onClick?.(
      [
        {
          _id: 'attack-1',
          data: [
            { field: ALERT_ATTACK_DISCOVERY_ALERT_IDS, value: ['alert-1'] },
            { field: TIMESTAMP, value: ['2024-05-02T09:00:00.000Z'] },
          ],
          ecs: { _id: 'attack-1' },
        },
        {
          _id: 'attack-2',
          data: [
            { field: ALERT_ATTACK_DISCOVERY_ALERT_IDS, value: ['alert-2'] },
            { field: TIMESTAMP, value: ['2024-04-28T06:00:00.000Z'] },
          ],
          ecs: { _id: 'attack-2' },
        },
      ],
      false,
      jest.fn(),
      jest.fn(),
      jest.fn()
    );

    expect(investigateInTimeline).toHaveBeenCalledWith(
      expect.objectContaining({
        timeRange: {
          kind: 'absolute',
          from: '2024-04-27T06:00:00.000Z',
          to: '2024-05-02T12:00:00.000Z',
        },
      })
    );

    jest.useRealTimers();
  });

  it('leaves the range to the time picker when no selected attack carries a timestamp', async () => {
    const investigateInTimeline = jest.fn();
    mockUseInvestigateInTimeline.mockReturnValue({
      investigateInTimeline,
    } as unknown as ReturnType<typeof useInvestigateInTimeline>);

    const { result } = renderHook(() => useBulkAttackInvestigateInTimelineItems(), { wrapper });
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

    expect(investigateInTimeline).toHaveBeenCalledWith(
      expect.objectContaining({ timeRange: undefined })
    );
  });

  it('should report TimelineInvestigationOpened event on click', async () => {
    const investigateInTimeline = jest.fn();
    mockUseInvestigateInTimeline.mockReturnValue({
      investigateInTimeline,
    } as unknown as ReturnType<typeof useInvestigateInTimeline>);

    const { result } = renderHook(
      () =>
        useBulkAttackInvestigateInTimelineItems({
          telemetrySource: 'attacks_page_group_take_action',
        }),
      {
        wrapper,
      }
    );
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

    expect(reportEventMock).toHaveBeenCalledWith(AttacksEventTypes.TimelineInvestigationOpened, {
      source: 'attacks_page_group_take_action',
    });
  });

  it('should return empty panels', () => {
    const { result } = renderHook(() => useBulkAttackInvestigateInTimelineItems(), { wrapper });
    expect(result.current.panels).toEqual([]);
  });
});
