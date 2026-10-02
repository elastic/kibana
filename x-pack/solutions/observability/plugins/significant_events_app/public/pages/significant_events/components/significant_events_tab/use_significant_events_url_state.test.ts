/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react';
import { SIGNIFICANT_EVENTS_TAB } from '../../../../../common';
import { useSignificantEventsUrlState } from './use_significant_events_url_state';

const mockPush = jest.fn();
const mockReplace = jest.fn();

let mockQuery: Record<string, unknown> = {};

jest.mock('../../../../hooks/use_significant_events_app_params', () => ({
  useSignificantEventsAppParams: () => ({ query: mockQuery }),
}));

jest.mock('../../../../hooks/use_significant_events_app_router', () => ({
  useSignificantEventsAppRouter: () => ({ push: mockPush, replace: mockReplace }),
}));

const lastReplaceQuery = () => mockReplace.mock.calls.at(-1)![1].query as Record<string, unknown>;

describe('useSignificantEventsUrlState', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockQuery = { rangeFrom: 'now-24h', rangeTo: 'now' };
  });

  describe('reading filters from the URL', () => {
    it('falls back to the defaults when the params are absent', () => {
      const { result } = renderHook(() => useSignificantEventsUrlState());

      expect(result.current.statusFilter).toEqual(['active']);
      expect(result.current.severityFilter).toEqual(['critical', 'high']);
      expect(result.current.streamFilter).toEqual([]);
      expect(result.current.serviceFilter).toEqual([]);
    });

    it('treats an empty param as an empty selection', () => {
      mockQuery = { status: '', severity: '' };
      const { result } = renderHook(() => useSignificantEventsUrlState());

      expect(result.current.statusFilter).toEqual([]);
      expect(result.current.severityFilter).toEqual([]);
    });

    it('accepts single and repeated values', () => {
      mockQuery = {
        status: 'inactive',
        severity: ['low', 'medium'],
        stream: 'logs',
        service: ['svc-a', 'svc-b'],
      };
      const { result } = renderHook(() => useSignificantEventsUrlState());

      expect(result.current.statusFilter).toEqual(['inactive']);
      expect(result.current.severityFilter).toEqual(['medium', 'low']);
      expect(result.current.streamFilter).toEqual(['logs']);
      expect(result.current.serviceFilter).toEqual(['svc-a', 'svc-b']);
    });

    it('drops unknown values and canonicalises the order', () => {
      mockQuery = {
        status: ['bogus', 'inactive', 'active'],
        severity: ['high', 'nope', 'critical'],
      };
      const { result } = renderHook(() => useSignificantEventsUrlState());

      expect(result.current.statusFilter).toEqual(['active', 'inactive']);
      expect(result.current.severityFilter).toEqual(['critical', 'high']);
    });
  });

  describe('setFilters', () => {
    it('writes only the given filters with a single replace and drops selectedEvent', () => {
      mockQuery = {
        rangeFrom: 'now-24h',
        rangeTo: 'now',
        selectedEvent: 'event-1',
        openEvent: 'event-1',
        severity: 'low',
        stream: ['logs'],
      };
      const { result } = renderHook(() => useSignificantEventsUrlState());

      act(() => result.current.setFilters({ status: ['inactive'] }));

      expect(mockReplace).toHaveBeenCalledTimes(1);
      expect(mockReplace).toHaveBeenCalledWith('/{tab}', {
        path: { tab: SIGNIFICANT_EVENTS_TAB },
        query: {
          rangeFrom: 'now-24h',
          rangeTo: 'now',
          openEvent: 'event-1',
          status: ['inactive'],
          severity: 'low',
          stream: ['logs'],
        },
      });
    });

    it('leaves untouched filters absent so they keep meaning "default"', () => {
      const { result } = renderHook(() => useSignificantEventsUrlState());

      act(() => result.current.setFilters({ stream: ['logs'] }));

      expect(lastReplaceQuery()).toEqual({
        rangeFrom: 'now-24h',
        rangeTo: 'now',
        stream: ['logs'],
      });
    });

    it('encodes an empty selection as an empty string', () => {
      const { result } = renderHook(() => useSignificantEventsUrlState());

      act(() => result.current.setFilters({ status: [], severity: [] }));

      expect(lastReplaceQuery()).toMatchObject({ status: '', severity: '' });
    });

    it('removes the stream param when the selection is cleared', () => {
      mockQuery = { stream: ['logs'] };
      const { result } = renderHook(() => useSignificantEventsUrlState());

      act(() => result.current.setFilters({ stream: [] }));

      expect(lastReplaceQuery()).not.toHaveProperty('stream');
    });

    it('writes the service param, keeps it on unrelated edits and removes it when cleared', () => {
      const { result } = renderHook(() => useSignificantEventsUrlState());

      act(() => result.current.setFilters({ service: ['svc-a'] }));
      expect(lastReplaceQuery()).toMatchObject({ service: ['svc-a'] });

      act(() => result.current.setFilters({ stream: ['logs'] }));
      expect(lastReplaceQuery()).toMatchObject({ service: ['svc-a'], stream: ['logs'] });

      act(() => result.current.setFilters({ service: [] }));
      expect(lastReplaceQuery()).not.toHaveProperty('service');
    });

    it('keeps selectedEvent and the openEvent written by deep-link normalization', () => {
      // Deep-link arrival: the mount effect writes openEvent = selectedEvent. A filter adaptation
      // issued in the same flush must build on that write, not on the stale render snapshot.
      mockQuery = { selectedEvent: 'event-1' };
      const { result } = renderHook(() => useSignificantEventsUrlState());

      act(() =>
        result.current.setFilters(
          { status: ['active'], severity: ['medium'], stream: ['logs'] },
          { keepSelectedEvent: true }
        )
      );

      expect(lastReplaceQuery()).toEqual({
        selectedEvent: 'event-1',
        openEvent: 'event-1',
        status: ['active'],
        severity: ['medium'],
        stream: ['logs'],
      });
    });

    it('composes consecutive writes issued before a re-render', () => {
      const { result } = renderHook(() => useSignificantEventsUrlState());

      act(() => {
        result.current.openEvent('event-2');
        result.current.setFilters({ status: [] });
      });

      expect(lastReplaceQuery()).toMatchObject({ openEvent: 'event-2', status: '' });
    });
  });

  describe('resetFilters', () => {
    it('removes the filter params and selectedEvent, keeping the rest', () => {
      mockQuery = {
        rangeFrom: 'now-24h',
        rangeTo: 'now',
        status: 'inactive',
        severity: '',
        stream: ['logs'],
        service: ['svc-a'],
        selectedEvent: 'event-1',
        openEvent: 'event-1',
      };
      const { result } = renderHook(() => useSignificantEventsUrlState());

      act(() => result.current.resetFilters());

      expect(mockReplace).toHaveBeenCalledWith('/{tab}', {
        path: { tab: SIGNIFICANT_EVENTS_TAB },
        query: { rangeFrom: 'now-24h', rangeTo: 'now', openEvent: 'event-1' },
      });
    });
  });

  describe('event selection preserves the filter params', () => {
    beforeEach(() => {
      mockQuery = {
        status: 'inactive',
        severity: ['low'],
        stream: 'logs',
        selectedEvent: 'event-1',
      };
    });

    it('openEvent', () => {
      const { result } = renderHook(() => useSignificantEventsUrlState());

      act(() => result.current.openEvent('event-2'));

      expect(mockPush).toHaveBeenCalledWith('/{tab}', {
        path: { tab: SIGNIFICANT_EVENTS_TAB },
        query: { ...mockQuery, openEvent: 'event-2' },
      });
    });

    it('closeEvent', () => {
      mockQuery = { ...mockQuery, openEvent: 'event-1' };
      const { result } = renderHook(() => useSignificantEventsUrlState());

      act(() => result.current.closeEvent());

      expect(mockPush).toHaveBeenLastCalledWith('/{tab}', {
        path: { tab: SIGNIFICANT_EVENTS_TAB },
        query: { status: 'inactive', severity: ['low'], stream: 'logs', selectedEvent: 'event-1' },
      });
    });

    it('clearSelectedEvent keeps the flyout open', () => {
      const { result } = renderHook(() => useSignificantEventsUrlState());

      act(() => result.current.clearSelectedEvent());

      // openEvent was written by deep-link normalization on mount and must survive the clear.
      expect(mockReplace).toHaveBeenLastCalledWith('/{tab}', {
        path: { tab: SIGNIFICANT_EVENTS_TAB },
        query: { status: 'inactive', severity: ['low'], stream: 'logs', openEvent: 'event-1' },
      });
    });
  });
});
