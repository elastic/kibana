/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { mockGlobalState, TestProviders, createMockStore } from '../../common/mock';
import { useTimelineDataFilters } from './use_timeline_data_filters';
import React from 'react';
import { SourcererScopeName } from '../../sourcerer/store/model';

jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  return { ...actual, useLocation: jest.fn().mockReturnValue({ pathname }) };
});

const defaultDataViewPattern = 'test-dataview-patterns';
const timelinePattern = 'test-timeline-patterns';
const pathname = '/alerts';
const store = createMockStore({
  ...mockGlobalState,
  sourcerer: {
    ...mockGlobalState.sourcerer,
    defaultDataView: {
      ...mockGlobalState.sourcerer.defaultDataView,
      patternList: [defaultDataViewPattern],
    },
    sourcererScopes: {
      ...mockGlobalState.sourcerer.sourcererScopes,
      [SourcererScopeName.analyzer]: {
        ...mockGlobalState.sourcerer.sourcererScopes[SourcererScopeName.timeline],
        selectedPatterns: [timelinePattern],
      },
    },
  },
  inputs: {
    ...mockGlobalState.inputs,
    timeline: {
      ...mockGlobalState.inputs.timeline,
      timerange: {
        kind: 'relative',
        fromStr: 'now/d',
        toStr: 'now/d',
        from: '2024-01-07T08:20:18.966Z',
        to: '2024-01-08T08:20:18.966Z',
      },
    },
  },
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <TestProviders store={store}>{children}</TestProviders>
);

describe('useTimelineDataFilters', () => {
  describe('on alerts page', () => {
    it('uses the same selected patterns throughout the app', () => {
      const { result } = renderHook(() => useTimelineDataFilters(false), { wrapper });
      const { result: timelineResult } = renderHook(() => useTimelineDataFilters(true), {
        wrapper,
      });

      expect(result.current.selectedPatterns).toEqual(timelineResult.current.selectedPatterns);
    });

    it('allows the other parts of the query to remain unique', () => {
      const { result } = renderHook(() => useTimelineDataFilters(false), { wrapper });
      const { result: timelineResult } = renderHook(() => useTimelineDataFilters(true), {
        wrapper,
      });

      expect(result.current.from !== timelineResult.current.from).toBeTruthy();
      expect(result.current.to !== timelineResult.current.to).toBeTruthy();
    });
  });
});
