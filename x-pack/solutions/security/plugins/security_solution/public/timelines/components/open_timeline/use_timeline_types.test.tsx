/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, waitFor, screen, renderHook } from '@testing-library/react';
import { useTimelineTypes } from './use_timeline_types';
import { TestProviders } from '../../../common/mock';

jest.mock('react-router-dom', () => {
  const original = jest.requireActual('react-router-dom');
  return {
    ...original,
    useParams: jest.fn().mockReturnValue('default'),
    useHistory: jest.fn().mockReturnValue([]),
  };
});

jest.mock('../../../common/components/link_to', () => {
  return {
    getTimelineTabsUrl: jest.fn(),
    useFormatUrl: jest.fn().mockReturnValue({
      formatUrl: jest.fn(),
      search: '',
    }),
  };
});

const mockNavigateToUrl = jest.fn();

jest.mock('@kbn/kibana-react-plugin/public', () => {
  const originalModule = jest.requireActual('@kbn/kibana-react-plugin/public');
  const useKibana = jest.fn().mockImplementation(() => ({
    services: {
      application: {
        navigateToUrl: mockNavigateToUrl,
      },
    },
  }));

  return {
    ...originalModule,
    useKibana,
  };
});

describe('useTimelineTypes', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('init', async () => {
    const { result } = renderHook(
      () => useTimelineTypes({ defaultTimelineCount: 0, templateTimelineCount: 3 }),
      {
        wrapper: TestProviders,
      }
    );

    expect(result.current).toEqual({
      timelineType: 'default',
      timelineTabs: result.current.timelineTabs,
      timelineFilters: result.current.timelineFilters,
    });
  });

  describe('timelineTabs', () => {
    it('render timelineTabs', async () => {
      const { result } = renderHook(
        () => useTimelineTypes({ defaultTimelineCount: 0, templateTimelineCount: 3 }),
        {
          wrapper: TestProviders,
        }
      );
      await waitFor(() => new Promise((resolve) => resolve(null)));

      render(result.current.timelineTabs);
      expect(screen.getByTestId('timeline-tab-default')).toHaveTextContent('Timelines');
      expect(screen.getByTestId('timeline-tab-template')).toHaveTextContent('Templates');
    });

    it('set timelineTypes correctly', async () => {
      const { result } = renderHook(
        () => useTimelineTypes({ defaultTimelineCount: 0, templateTimelineCount: 3 }),
        {
          wrapper: TestProviders,
        }
      );

      await waitFor(() => expect(result.current.timelineTabs).toBeDefined());

      const { container } = render(result.current.timelineTabs);

      fireEvent(
        container.querySelector('[data-test-subj="timeline-tab-template"]')!,
        new MouseEvent('click', {
          bubbles: true,
          cancelable: true,
        })
      );

      expect(mockNavigateToUrl).toHaveBeenCalled();
    });

    it('stays in the same tab if clicking again on current tab', async () => {
      const { result } = renderHook(
        () => useTimelineTypes({ defaultTimelineCount: 0, templateTimelineCount: 3 }),
        {
          wrapper: TestProviders,
        }
      );
      await waitFor(() => new Promise((resolve) => resolve(null)));

      render(result.current.timelineTabs);

      fireEvent(
        screen.getByTestId('timeline-tab-default'),
        new MouseEvent('click', {
          bubbles: true,
          cancelable: true,
        })
      );

      await waitFor(() => {
        expect(result.current).toEqual({
          timelineType: 'default',
          timelineTabs: result.current.timelineTabs,
          timelineFilters: result.current.timelineFilters,
        });
      });
    });
  });

  describe('timelineFilters', () => {
    it('render timelineFilters', async () => {
      const { result } = renderHook(
        () => useTimelineTypes({ defaultTimelineCount: 0, templateTimelineCount: 3 }),
        {
          wrapper: TestProviders,
        }
      );
      await waitFor(() => new Promise((resolve) => resolve(null)));

      const { container } = render(<>{result.current.timelineFilters}</>);

      expect(
        container.querySelector('[data-test-subj="open-timeline-modal-body-filter-default"]')
      ).toHaveTextContent('Timelines');
      expect(
        container.querySelector('[data-test-subj="open-timeline-modal-body-filter-template"]')
      ).toHaveTextContent('Templates');
    });

    it('set timelineTypes correctly', async () => {
      const { result } = renderHook(
        () => useTimelineTypes({ defaultTimelineCount: 0, templateTimelineCount: 3 }),
        {
          wrapper: TestProviders,
        }
      );

      await waitFor(() => expect(result.current.timelineFilters).toBeDefined());

      render(<>{result.current.timelineFilters}</>);

      await waitFor(() => new Promise((resolve) => resolve(null)));

      fireEvent.click(screen.getByTestId('open-timeline-modal-body-filter-template'));

      await waitFor(() => expect(result.current.timelineType).toEqual('template'));

      expect(result.current).toEqual(
        expect.objectContaining({
          timelineTabs: result.current.timelineTabs,
          timelineFilters: result.current.timelineFilters,
        })
      );
    });

    it('stays in the same tab if clicking again on current tab', async () => {
      const { result } = renderHook(
        () => useTimelineTypes({ defaultTimelineCount: 0, templateTimelineCount: 3 }),
        {
          wrapper: TestProviders,
        }
      );

      await waitFor(() => new Promise((resolve) => resolve(null)));

      const { container } = render(<>{result.current.timelineFilters}</>);

      fireEvent(
        container.querySelector('[data-test-subj="open-timeline-modal-body-filter-default"]')!,
        new MouseEvent('click', {
          bubbles: true,
          cancelable: true,
        })
      );

      await waitFor(() =>
        expect(result.current).toEqual({
          timelineType: 'default',
          timelineTabs: result.current.timelineTabs,
          timelineFilters: result.current.timelineFilters,
        })
      );
    });
  });
});
