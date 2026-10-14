/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { renderHook } from '@testing-library/react';
import { useCreateTimeline } from './use_create_timeline';
import type { TimeRange } from '../../common/store/inputs/model';
import { RowRendererCount, TimelineTypeEnum } from '../../../common/api/timeline';
import { TimelineId } from '../../../common/types';
import { useDiscoverInTimelineContext } from '../../common/components/discover_in_timeline/use_discover_in_timeline_context';
import { timelineActions } from '../store';
import { inputsActions } from '../../common/store/inputs';
import { appActions } from '../../common/store/app';
import { InputsModelId } from '../../common/store/inputs/constants';
import { TestProviders } from '../../common/mock';
import { defaultUdtHeaders } from '../components/timeline/body/column_headers/default_headers';
import { PageScope } from '../../data_view_manager/constants';
import { useSecurityDefaultPatterns } from '../../data_view_manager/hooks/use_security_default_patterns';
import { useSelectDataView } from '../../data_view_manager/hooks/use_select_data_view';

jest.mock('../../common/components/discover_in_timeline/use_discover_in_timeline_context');
jest.mock('../../common/containers/use_global_time', () => {
  return {
    useGlobalTime: jest.fn().mockReturnValue({
      from: '2022-04-05T12:00:00.000Z',
      to: '2022-04-08T12:00:00.000Z',
      setQuery: () => jest.fn(),
      deleteQuery: () => jest.fn(),
    }),
  };
});
jest.mock('../../common/lib/kibana');
jest.mock('../../data_view_manager/hooks/use_security_default_patterns');
jest.mock('../../data_view_manager/hooks/use_select_data_view');

const mockDefaultPatterns = {
  id: 'security-solution',
  indexPatterns: [
    '.siem-signals-spacename',
    'apm-*-transaction*',
    'auditbeat-*',
    'endgame-*',
    'filebeat-*',
    'logs-*',
    'packetbeat-*',
    'traces-apm*',
    'winlogbeat-*',
    '-*elastic-cloud-logs-*',
  ],
};

describe('useCreateTimeline', () => {
  const resetDiscoverAppState = jest.fn().mockResolvedValue({});
  const selectDataView = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useDiscoverInTimelineContext as jest.Mock).mockReturnValue({ resetDiscoverAppState });
    (useSelectDataView as jest.Mock).mockReturnValue(selectDataView);
    (useSecurityDefaultPatterns as jest.Mock).mockReturnValue(mockDefaultPatterns);
  });

  it('should return a function', () => {
    const hookResult = renderHook(
      () =>
        useCreateTimeline({ timelineId: TimelineId.test, timelineType: TimelineTypeEnum.default }),
      {
        wrapper: ({ children }: React.PropsWithChildren<{}>) => (
          <TestProviders>{children}</TestProviders>
        ),
      }
    );

    expect(hookResult.result.current).toEqual(expect.any(Function));
  });

  it('should dispatch correct actions when calling the returned function', async () => {
    const createTimeline = jest.spyOn(timelineActions, 'createTimeline');
    const addLinkTo = jest.spyOn(inputsActions, 'addLinkTo');
    const addNotes = jest.spyOn(appActions, 'addNotes');

    const hookResult = renderHook(
      () =>
        useCreateTimeline({ timelineId: TimelineId.test, timelineType: TimelineTypeEnum.default }),
      {
        wrapper: ({ children }: React.PropsWithChildren<{}>) => (
          <TestProviders>{children}</TestProviders>
        ),
      }
    );

    expect(hookResult.result.current).toEqual(expect.any(Function));

    await hookResult.result.current();
    expect(createTimeline.mock.calls[0][0].id).toEqual(TimelineId.test);
    expect(createTimeline.mock.calls[0][0].timelineType).toEqual(TimelineTypeEnum.default);
    expect(createTimeline.mock.calls[0][0].columns).toEqual(defaultUdtHeaders);
    expect(createTimeline.mock.calls[0][0].dataViewId).toEqual(mockDefaultPatterns.id);
    expect(createTimeline.mock.calls[0][0].indexNames).toEqual(
      expect.arrayContaining(mockDefaultPatterns.indexPatterns)
    );
    expect(createTimeline.mock.calls[0][0].show).toEqual(true);
    expect(createTimeline.mock.calls[0][0].updated).toEqual(undefined);
    expect(createTimeline.mock.calls[0][0].excludedRowRendererIds).toHaveLength(RowRendererCount);
    expect(selectDataView.mock.calls[0][0].scope).toEqual(PageScope.timeline);
    expect(selectDataView.mock.calls[0][0].id).toEqual(mockDefaultPatterns.id);
    expect(selectDataView.mock.calls[0][0].fallbackPatterns).toEqual(
      expect.arrayContaining(mockDefaultPatterns.indexPatterns)
    );
    expect(addLinkTo).toHaveBeenCalledWith([InputsModelId.global, InputsModelId.timeline]);
    expect(addNotes).toHaveBeenCalledWith({ notes: [] });
  });

  it('should run the onClick method if provided', async () => {
    const onClick = jest.fn();
    const hookResult = renderHook(
      () =>
        useCreateTimeline({
          timelineId: TimelineId.test,
          timelineType: TimelineTypeEnum.default,
          onClick,
        }),
      {
        wrapper: ({ children }: React.PropsWithChildren<{}>) => (
          <TestProviders>{children}</TestProviders>
        ),
      }
    );

    await hookResult.result.current();

    expect(onClick).toHaveBeenCalled();
    expect(resetDiscoverAppState).toHaveBeenCalled();
  });

  it('should dispatch removeLinkTo action if absolute timeRange is passed to callback', async () => {
    const removeLinkTo = jest.spyOn(inputsActions, 'removeLinkTo');
    const setAbsoluteRangeDatePicker = jest.spyOn(inputsActions, 'setAbsoluteRangeDatePicker');

    const hookResult = renderHook(
      () =>
        useCreateTimeline({ timelineId: TimelineId.test, timelineType: TimelineTypeEnum.default }),
      {
        wrapper: ({ children }: React.PropsWithChildren<{}>) => (
          <TestProviders>{children}</TestProviders>
        ),
      }
    );

    const timeRange: TimeRange = { kind: 'absolute', from: '', to: '' };
    await hookResult.result.current({ timeRange });

    expect(removeLinkTo).toHaveBeenCalledWith([InputsModelId.timeline, InputsModelId.global]);
    expect(setAbsoluteRangeDatePicker).toHaveBeenCalledWith({
      ...timeRange,
      id: InputsModelId.timeline,
    });
  });

  it('should dispatch removeLinkTo action if relative timeRange is passed to callback', async () => {
    const setRelativeRangeDatePicker = jest.spyOn(inputsActions, 'setRelativeRangeDatePicker');

    const hookResult = renderHook(
      () =>
        useCreateTimeline({ timelineId: TimelineId.test, timelineType: TimelineTypeEnum.default }),
      {
        wrapper: ({ children }: React.PropsWithChildren<{}>) => (
          <TestProviders>{children}</TestProviders>
        ),
      }
    );

    const timeRange: TimeRange = { kind: 'relative', fromStr: '', toStr: '', from: '', to: '' };
    await hookResult.result.current({ timeRange });

    expect(setRelativeRangeDatePicker).toHaveBeenCalledWith({
      ...timeRange,
      id: InputsModelId.timeline,
    });
  });
});
