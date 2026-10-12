/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { LastEventIndexKey } from '../../../../common/search_strategy';
import { useTimelineLastEventTime } from '../../containers/events/last_event_time';
import { useDateFormat, useTimeZone } from '../../lib/kibana';
import { useLastEventTimeText } from './use_last_event_time_text';

jest.mock('../../containers/events/last_event_time', () => ({
  useTimelineLastEventTime: jest.fn(),
}));

jest.mock('../../lib/kibana', () => ({
  useDateFormat: jest.fn(),
  useTimeZone: jest.fn(),
}));

const renderLastEventTimeText = () =>
  renderHook(() =>
    useLastEventTimeText({
      indexKey: LastEventIndexKey.hosts,
      indexNames: [],
    })
  );

describe('useLastEventTimeText', () => {
  beforeEach(() => {
    (useDateFormat as jest.Mock).mockReturnValue('MMM D, YYYY @ HH:mm:ss.SSS');
    (useTimeZone as jest.Mock).mockReturnValue('UTC');
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns a loading description while the last event query is in flight', () => {
    (useTimelineLastEventTime as jest.Mock).mockReturnValue([
      true,
      { lastSeen: null, errorMessage: null },
    ]);

    const { result } = renderLastEventTimeText();

    expect(result.current).toBe('Last event: loading...');
  });

  it('formats an event within the last hour the same way as FormattedRelative', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-10-01T12:00:00.000Z'));
    (useTimelineLastEventTime as jest.Mock).mockReturnValue([
      false,
      { lastSeen: '2026-10-01T11:59:30.000Z', errorMessage: null },
    ]);

    const { result } = renderLastEventTimeText();

    expect(result.current).toBe('Last event: 30 seconds ago');
    jest.useRealTimers();
  });

  it('formats an event older than an hour with the user date format', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-10-01T12:00:00.000Z'));
    (useTimelineLastEventTime as jest.Mock).mockReturnValue([
      false,
      { lastSeen: '2026-10-01T09:00:00.000Z', errorMessage: null },
    ]);

    const { result } = renderLastEventTimeText();

    expect(result.current).toBe('Last event: Oct 1, 2026 @ 09:00:00.000');
    jest.useRealTimers();
  });

  it('returns nothing when the query fails', () => {
    (useTimelineLastEventTime as jest.Mock).mockReturnValue([
      false,
      { lastSeen: null, errorMessage: 'failed' },
    ]);

    const { result } = renderLastEventTimeText();

    expect(result.current).toBeUndefined();
  });
});
