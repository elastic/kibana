/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '../../common/mock/react_beautiful_dnd';
import { TestProviders, createMockStore, mockGlobalState } from '../../common/mock';
import { TimelineId } from '../../../common/types/timeline';
import * as timelineActions from '../store/actions';
import { timelineFlyoutHistoryKey } from '../../flyout_v2/shared/constants/flyout_history';
import { TimelineWrapper } from '.';

/** A `historyKey` unrelated to Timeline, representing a flyout opened before Timeline was shown. */
const preTimelineHistoryKey = Symbol('pre-timeline-flyout');

/**
 * Builds a store where the timeline modal is shown (`show: true`), mirroring the
 * graph "Investigate in Timeline" scenario where the modal is rendered on top of
 * the expandable flyout.
 */
const createVisibleTimelineStore = () =>
  createMockStore({
    ...mockGlobalState,
    timeline: {
      ...mockGlobalState.timeline,
      timelineById: {
        ...mockGlobalState.timeline.timelineById,
        [TimelineId.test]: {
          ...mockGlobalState.timeline.timelineById[TimelineId.test],
          show: true,
        },
      },
    },
  });

const mockDispatch = jest.fn();
jest.mock('react-redux-v7', () => {
  const original = jest.requireActual('react-redux-v7');

  return {
    ...original,
    useDispatch: () => mockDispatch,
  };
});
jest.mock('../components/timeline', () => ({
  StatefulTimeline: () => <div />,
}));
jest.mock('../../common/hooks/timeline/use_timeline_save_prompt');

const mockGetFlyoutManagerState = jest.fn(() => ({ sessions: [] as unknown[] }));
const mockCloseFlyout = jest.fn();
const mockCloseAllFlyouts = jest.fn();
jest.mock('@elastic/eui', () => ({
  ...jest.requireActual('@elastic/eui'),
  getFlyoutManagerStore: jest.fn(() => ({
    getState: mockGetFlyoutManagerState,
    closeFlyout: mockCloseFlyout,
    closeAllFlyouts: mockCloseAllFlyouts,
    addUnmanagedFlyout: jest.fn(),
    closeUnmanagedFlyout: jest.fn(),
  })),
}));

describe('TimelineWrapper', () => {
  const props = {
    onAppLeave: jest.fn(),
    timelineId: TimelineId.test,
  };

  beforeEach(() => {
    mockDispatch.mockClear();
    mockCloseFlyout.mockClear();
    mockCloseAllFlyouts.mockClear();
    mockGetFlyoutManagerState.mockReturnValue({ sessions: [] });
  });

  it('should render correctly the main timeline elements', () => {
    const { getByTestId } = render(
      <TestProviders>
        <TimelineWrapper {...props} />
      </TestProviders>
    );
    expect(getByTestId('timeline-portal-ref')).toBeInTheDocument();
    expect(getByTestId('timeline-bottom-bar')).toBeInTheDocument();
  });

  it('should render the default timeline state as a bottom bar', () => {
    const { getByText } = render(
      <TestProviders>
        <TimelineWrapper {...props} />
      </TestProviders>
    );

    expect(getByText('Untitled Timeline')).toBeInTheDocument();
  });

  it('should show timeline when bottom bar button is clicked', async () => {
    const { getByTestId } = render(
      <TestProviders>
        <TimelineWrapper {...props} />
      </TestProviders>
    );

    await userEvent.click(getByTestId('timeline-bottom-bar-title-button'));

    expect(mockDispatch).toHaveBeenCalledWith(
      timelineActions.showTimeline({ id: TimelineId.test, show: true })
    );
  });

  describe('Esc key handling', () => {
    it('should close a main-level flyout opened from within Timeline via closeAllFlyouts, and not the timeline itself', async () => {
      // Mirrors EuiManagedFlyout's own `onClose` for a main-level flyout with no child, which
      // calls `closeAllFlyouts()` (not `closeFlyout(id)`) so that any sibling session sharing
      // its historyKey is cascade-closed too.
      mockGetFlyoutManagerState.mockReturnValue({
        sessions: [
          { mainFlyoutId: 'flyout-b', childFlyoutId: null, historyKey: timelineFlyoutHistoryKey },
        ],
      });

      render(
        <TestProviders store={createVisibleTimelineStore()}>
          <TimelineWrapper {...props} />
        </TestProviders>
      );

      await userEvent.keyboard('{Escape}');

      expect(mockCloseAllFlyouts).toHaveBeenCalledTimes(1);
      expect(mockCloseFlyout).not.toHaveBeenCalled();
      expect(mockDispatch).not.toHaveBeenCalledWith(
        timelineActions.showTimeline({ id: TimelineId.test, show: false })
      );
    });

    it('should close only its child flyout when one is open, keeping its main flyout and the timeline open', async () => {
      mockGetFlyoutManagerState.mockReturnValue({
        sessions: [
          {
            mainFlyoutId: 'flyout-b',
            childFlyoutId: 'flyout-b-child',
            historyKey: timelineFlyoutHistoryKey,
          },
        ],
      });

      render(
        <TestProviders store={createVisibleTimelineStore()}>
          <TimelineWrapper {...props} />
        </TestProviders>
      );

      await userEvent.keyboard('{Escape}');

      expect(mockCloseFlyout).toHaveBeenCalledWith('flyout-b-child');
      expect(mockCloseFlyout).not.toHaveBeenCalledWith('flyout-b');
      expect(mockDispatch).not.toHaveBeenCalledWith(
        timelineActions.showTimeline({ id: TimelineId.test, show: false })
      );
    });

    it('should close only the topmost flyout opened from within Timeline, leaving the flyout opened before Timeline untouched', async () => {
      // Regression test: flyout A is opened (e.g. from the alerts table, keeping its own
      // unrelated historyKey), then "Investigate in Timeline" opens the Timeline modal on top,
      // then flyout B is opened from within Timeline (tagged with `timelineFlyoutHistoryKey`).
      // Both are independent main sessions with no child of their own, so EUI's own
      // (globally-scoped) Esc handling would otherwise close both at once. Only B (the one
      // opened from within Timeline) should close on this Esc press - `closeAllFlyouts` is
      // scoped to sessions sharing the *topmost* session's historyKey, so A (a different
      // historyKey) is unaffected.
      mockGetFlyoutManagerState.mockReturnValue({
        sessions: [
          { mainFlyoutId: 'flyout-a', childFlyoutId: null, historyKey: preTimelineHistoryKey },
          { mainFlyoutId: 'flyout-b', childFlyoutId: null, historyKey: timelineFlyoutHistoryKey },
        ],
      });

      render(
        <TestProviders store={createVisibleTimelineStore()}>
          <TimelineWrapper {...props} />
        </TestProviders>
      );

      await userEvent.keyboard('{Escape}');

      expect(mockCloseAllFlyouts).toHaveBeenCalledTimes(1);
      expect(mockCloseFlyout).not.toHaveBeenCalled();
      expect(mockDispatch).not.toHaveBeenCalledWith(
        timelineActions.showTimeline({ id: TimelineId.test, show: false })
      );
    });

    it('should cascade-close a whole within-Timeline flyout stack (eg a tools flyout opened from a document flyout) in one Esc press, revealing Timeline', async () => {
      // Regression test for the exact scenario reported: open a document flyout from Timeline
      // (session A), open its Analyzer tool from it - which opens as its *own* top-level
      // session (session B) sharing A's historyKey, not as A's child - then open a child
      // document flyout from Analyzer (joins B as its child). Sessions: [A (no child), B (with
      // child)], both tagged `timelineFlyoutHistoryKey`.
      //
      // 1st Esc: closes B's child.
      // 2nd Esc: B (now childless) closes via `closeAllFlyouts`, which - because A shares B's
      // historyKey - cascades to close A too, revealing Timeline directly. Using `closeFlyout`
      // instead would only remove B, incorrectly revealing A instead of Timeline.
      mockGetFlyoutManagerState.mockReturnValue({
        sessions: [
          {
            mainFlyoutId: 'document-flyout-a',
            childFlyoutId: null,
            historyKey: timelineFlyoutHistoryKey,
          },
          {
            mainFlyoutId: 'analyzer-flyout-b',
            childFlyoutId: null,
            historyKey: timelineFlyoutHistoryKey,
          },
        ],
      });

      render(
        <TestProviders store={createVisibleTimelineStore()}>
          <TimelineWrapper {...props} />
        </TestProviders>
      );

      await userEvent.keyboard('{Escape}');

      expect(mockCloseAllFlyouts).toHaveBeenCalledTimes(1);
      expect(mockCloseFlyout).not.toHaveBeenCalledWith('document-flyout-a');
      expect(mockCloseFlyout).not.toHaveBeenCalledWith('analyzer-flyout-b');
      expect(mockDispatch).not.toHaveBeenCalledWith(
        timelineActions.showTimeline({ id: TimelineId.test, show: false })
      );
    });

    it('should close the timeline itself (not the underlying flyout) once nothing opened from within Timeline remains on top', async () => {
      // Regression test: only flyout A remains, opened *before* Timeline was shown (its
      // historyKey doesn't match `timelineFlyoutHistoryKey`). Esc should close Timeline next,
      // leaving A untouched until Timeline is gone.
      mockGetFlyoutManagerState.mockReturnValue({
        sessions: [
          { mainFlyoutId: 'flyout-a', childFlyoutId: null, historyKey: preTimelineHistoryKey },
        ],
      });

      render(
        <TestProviders store={createVisibleTimelineStore()}>
          <TimelineWrapper {...props} />
        </TestProviders>
      );

      await userEvent.keyboard('{Escape}');

      expect(mockCloseFlyout).not.toHaveBeenCalled();
      expect(mockDispatch).toHaveBeenCalledWith(
        timelineActions.showTimeline({ id: TimelineId.test, show: false })
      );
    });

    it('should not let the underlying flyouts own (buggy, globally-scoped) Esc listener also fire', async () => {
      // Asserts the sibling window keydown listener (representing a managed flyout's own
      // EuiWindowEvent handler) never runs, since we stop propagation ourselves - even when we
      // end up closing Timeline rather than the flyout itself.
      const underlyingFlyoutHandler = jest.fn();
      mockGetFlyoutManagerState.mockReturnValue({
        sessions: [
          { mainFlyoutId: 'flyout-a', childFlyoutId: null, historyKey: preTimelineHistoryKey },
        ],
      });

      render(
        <TestProviders store={createVisibleTimelineStore()}>
          <TimelineWrapper {...props} />
        </TestProviders>
      );

      window.addEventListener('keydown', underlyingFlyoutHandler);

      try {
        await userEvent.keyboard('{Escape}');

        expect(underlyingFlyoutHandler).not.toHaveBeenCalled();
      } finally {
        window.removeEventListener('keydown', underlyingFlyoutHandler);
      }
    });

    it('should close the timeline itself when no flyout session is active', async () => {
      mockGetFlyoutManagerState.mockReturnValue({ sessions: [] });

      render(
        <TestProviders store={createVisibleTimelineStore()}>
          <TimelineWrapper {...props} />
        </TestProviders>
      );

      await userEvent.keyboard('{Escape}');

      expect(mockCloseFlyout).not.toHaveBeenCalled();
      expect(mockDispatch).toHaveBeenCalledWith(
        timelineActions.showTimeline({ id: TimelineId.test, show: false })
      );
    });

    it('should not close a flyout session nor the timeline when the timeline is not visible', async () => {
      mockGetFlyoutManagerState.mockReturnValue({
        sessions: [{ mainFlyoutId: 'flyout-a', childFlyoutId: null }],
      });

      render(
        <TestProviders>
          <TimelineWrapper {...props} />
        </TestProviders>
      );

      await userEvent.keyboard('{Escape}');

      expect(mockCloseFlyout).not.toHaveBeenCalled();
      expect(mockDispatch).not.toHaveBeenCalledWith(
        timelineActions.showTimeline({ id: TimelineId.test, show: false })
      );
    });
  });
});
