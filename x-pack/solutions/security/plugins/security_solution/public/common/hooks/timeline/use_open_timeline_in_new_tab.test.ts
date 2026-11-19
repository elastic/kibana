/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';
import { decode } from '@kbn/rison';
import type { DataProvider } from '../../../../common/types';
import { DataProviderTypeEnum } from '../../../../common/api/timeline';
import { EXISTS_OPERATOR, IS_OPERATOR } from '../../../../common/types/timeline';
import { useKibana } from '../../lib/kibana';
import { useOpenTimelineInNewTab } from './use_open_timeline_in_new_tab';

jest.mock('../../lib/kibana');

const getUrlForApp = jest.fn(
  (_appId: string, { path }: { path: string }) => `/app/security/${path}`
);

const buildDataProvider = (field: string, value: string): DataProvider => ({
  and: [],
  enabled: true,
  id: `${field}-${value}`,
  name: field,
  excluded: false,
  kqlQuery: '',
  type: DataProviderTypeEnum.default,
  queryMatch: {
    field,
    value,
    operator: IS_OPERATOR,
  },
});

describe('useOpenTimelineInNewTab', () => {
  let windowOpenSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    (useKibana as jest.Mock).mockReturnValue({
      services: { application: { getUrlForApp } },
    });
    windowOpenSpy = jest.spyOn(window, 'open').mockImplementation(() => null);
  });

  afterEach(() => {
    windowOpenSpy.mockRestore();
  });

  describe('openSavedTimelineInNewTab', () => {
    it('opens the alerts page with the saved timeline id in a new tab', () => {
      const { result } = renderHook(() => useOpenTimelineInNewTab());

      act(() => {
        result.current.openSavedTimelineInNewTab('my-timeline-id');
      });

      expect(getUrlForApp).toHaveBeenCalledWith('securitySolutionUI', {
        path: `alerts?timeline=(id:'my-timeline-id',isOpen:!t)`,
      });
      expect(windowOpenSpy).toHaveBeenCalledWith(
        `/app/security/alerts?timeline=(id:'my-timeline-id',isOpen:!t)`,
        '_blank',
        'noopener,noreferrer'
      );
    });
  });

  describe('openAdHocTimelineInNewTab', () => {
    it('encodes data providers into a KQL timeline query and time range', () => {
      const { result } = renderHook(() => useOpenTimelineInNewTab());

      act(() => {
        result.current.openAdHocTimelineInNewTab({
          dataProviders: [buildDataProvider('process.pid', '123')],
          filters: [],
          timeRange: { kind: 'absolute', from: 'from-date', to: 'to-date' },
        });
      });

      const path = getUrlForApp.mock.calls[0][1].path as string;
      const [, search] = path.split('alerts?');
      const params = new URLSearchParams(search);

      const timeline = decode(params.get('timeline') as string) as {
        activeTab: string;
        isOpen: boolean;
        query: { kind: string; expression: string };
      };
      expect(timeline.activeTab).toBe('query');
      expect(timeline.isOpen).toBe(true);
      expect(timeline.query.expression).toContain('process.pid');
      expect(timeline.query.expression).toContain('123');

      const timerange = decode(params.get('timerange') as string) as {
        timeline: { timerange: { from: string; to: string } };
      };
      expect(timerange.timeline.timerange.from).toBe('from-date');
      expect(timerange.timeline.timerange.to).toBe('to-date');

      expect(windowOpenSpy).toHaveBeenCalledWith(
        expect.stringContaining('/app/security/alerts?'),
        '_blank',
        'noopener,noreferrer'
      );
    });

    it('translates range filters into KQL range clauses', () => {
      const { result } = renderHook(() => useOpenTimelineInNewTab());

      act(() => {
        result.current.openAdHocTimelineInNewTab({
          dataProviders: [],
          filters: [
            {
              meta: { negate: false, type: 'range' },
              query: { range: { 'process.pid': { gte: 1, lt: 100 } } },
            } as unknown as import('@kbn/es-query').Filter,
          ],
        });
      });

      const path = getUrlForApp.mock.calls[0][1].path as string;
      const [, search] = path.split('alerts?');
      const params = new URLSearchParams(search);
      const timeline = decode(params.get('timeline') as string) as {
        query?: { expression: string };
      };
      expect(timeline.query?.expression).toBe('process.pid >= 1 and process.pid < 100');
    });

    it('omits the query when there is nothing to translate', () => {
      const { result } = renderHook(() => useOpenTimelineInNewTab());

      act(() => {
        result.current.openAdHocTimelineInNewTab({ dataProviders: [], filters: [] });
      });

      const path = getUrlForApp.mock.calls[0][1].path as string;
      const [, search] = path.split('alerts?');
      const params = new URLSearchParams(search);
      const timeline = decode(params.get('timeline') as string) as { query?: unknown };
      expect(timeline.query).toBeUndefined();
      expect(params.get('timerange')).toBeNull();
    });

    it('translates exists filters into KQL exists clauses', () => {
      const { result } = renderHook(() => useOpenTimelineInNewTab());

      act(() => {
        result.current.openAdHocTimelineInNewTab({
          dataProviders: [buildExistsDataProvider('user.name')],
          filters: [],
        });
      });

      const path = getUrlForApp.mock.calls[0][1].path as string;
      const [, search] = path.split('alerts?');
      const params = new URLSearchParams(search);
      const timeline = decode(params.get('timeline') as string) as {
        query?: { expression: string };
      };
      expect(timeline.query?.expression).toBe('user.name :*');
    });
  });
});

const buildExistsDataProvider = (field: string): DataProvider => ({
  and: [],
  enabled: true,
  id: `${field}-exists`,
  name: field,
  excluded: false,
  kqlQuery: '',
  type: DataProviderTypeEnum.default,
  queryMatch: {
    field,
    value: '',
    operator: EXISTS_OPERATOR,
  },
});
