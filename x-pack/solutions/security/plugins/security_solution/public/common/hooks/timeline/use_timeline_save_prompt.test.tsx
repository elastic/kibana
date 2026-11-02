/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, renderHook } from '@testing-library/react';
import { Provider } from 'react-redux-v7';
import { Router } from '@kbn/shared-ux-router';
import { createMemoryHistory } from 'history';
import type { MemoryHistory } from 'history';
import type { AppLeaveActionFactory, AppLeaveHandler } from '@kbn/core-application-browser';
import { AppLeaveActionType } from '@kbn/core-application-browser';
import { TimelineId } from '../../../../common/types';
import { createMockStore } from '../../mock';
import { timelineActions } from '../../../timelines/store';
import { selectTimelineById } from '../../../timelines/store/selectors';
import { useTimelineSavePrompt } from './use_timeline_save_prompt';

const mockOpenConfirm = jest.fn();
const mockNavigateToUrl = jest.fn();

jest.mock('../../lib/kibana', () => ({
  useKibana: () => ({
    services: {
      overlays: { openConfirm: mockOpenConfirm },
      application: { navigateToUrl: mockNavigateToUrl },
      http: { basePath: { get: () => '' } },
    },
  }),
}));

// The navigation target never shows Timeline, so the prompt is allowed to show.
jest.mock('../../utils/timeline/use_show_timeline_for_path', () => ({
  useShowTimelineForGivenPath: () => () => false,
}));

const actionsMock: AppLeaveActionFactory = {
  confirm: jest.fn((text, title, callback) => ({
    type: AppLeaveActionType.confirm,
    text,
    title,
    callback,
  })),
  default: jest.fn(() => ({ type: AppLeaveActionType.default })),
};

const flushPromises = () => act(async () => {});

describe('useTimelineSavePrompt', () => {
  let store: ReturnType<typeof createMockStore>;
  let history: MemoryHistory;
  let appLeaveHandler: AppLeaveHandler | undefined;
  const onAppLeave = jest.fn((handler: AppLeaveHandler) => {
    appLeaveHandler = handler;
  });

  const getChanged = () => selectTimelineById(store.getState(), TimelineId.active).changed;

  const renderPromptHook = () =>
    renderHook(() => useTimelineSavePrompt(TimelineId.active, onAppLeave), {
      wrapper: ({ children }: React.PropsWithChildren<{}>) => (
        <Provider store={store}>
          <Router history={history}>{children}</Router>
        </Provider>
      ),
    });

  const leaveToOtherApp = () => appLeaveHandler?.(actionsMock, 'fleet');

  beforeEach(() => {
    jest.clearAllMocks();
    appLeaveHandler = undefined;
    store = createMockStore();
    history = createMemoryHistory({ initialEntries: ['/entity_analytics'] });
    store.dispatch(timelineActions.updateProviders({ id: TimelineId.active, providers: [] }));
  });

  it('marks the timeline as changed after a change action', () => {
    expect(getChanged()).toBe(true);
  });

  describe('history.block path', () => {
    it('resets `changed` and navigates when the user confirms', async () => {
      mockOpenConfirm.mockResolvedValue(true);
      renderPromptHook();

      act(() => {
        history.push('/findings');
      });
      await flushPromises();

      expect(mockOpenConfirm).toHaveBeenCalledTimes(1);
      expect(getChanged()).toBe(false);
      expect(mockNavigateToUrl).toHaveBeenCalledWith('/findings', { state: undefined });
    });

    it('opens the save modal and keeps `changed` when the user cancels', async () => {
      mockOpenConfirm.mockResolvedValue(false);
      renderPromptHook();

      act(() => {
        history.push('/findings');
      });
      await flushPromises();

      expect(getChanged()).toBe(true);
      expect(mockNavigateToUrl).not.toHaveBeenCalled();
      expect(selectTimelineById(store.getState(), TimelineId.active).showSaveModal).toBe(true);
    });

    it('does not prompt again after the user confirmed leaving', async () => {
      mockOpenConfirm.mockResolvedValue(true);

      const { unmount } = renderPromptHook();
      act(() => {
        history.push('/findings');
      });
      await flushPromises();
      expect(mockOpenConfirm).toHaveBeenCalledTimes(1);
      expect(mockNavigateToUrl).toHaveBeenCalledTimes(1);
      unmount();

      history.push('/entity_analytics');
      renderPromptHook();
      act(() => {
        history.push('/findings');
      });
      await flushPromises();

      expect(mockOpenConfirm).toHaveBeenCalledTimes(1);
    });
  });

  describe('onAppLeave path', () => {
    it('returns `confirm` when the timeline has unsaved changes', () => {
      renderPromptHook();
      expect(leaveToOtherApp()).toEqual(
        expect.objectContaining({ type: AppLeaveActionType.confirm })
      );
    });

    it('returns `default` when the timeline has no unsaved changes', () => {
      store.dispatch(timelineActions.setChanged({ id: TimelineId.active, changed: false }));
      renderPromptHook();
      expect(leaveToOtherApp()).toEqual({ type: AppLeaveActionType.default });
    });

    it('resets `changed` on unmount after the user confirmed leaving', () => {
      const { unmount } = renderPromptHook();
      leaveToOtherApp();
      expect(getChanged()).toBe(true);

      unmount();

      expect(getChanged()).toBe(false);
    });

    it('keeps `changed` on unmount after the user cancelled', () => {
      const { unmount } = renderPromptHook();
      const action = leaveToOtherApp();
      act(() => {
        if (action?.type === AppLeaveActionType.confirm) {
          action.callback?.();
        }
      });

      unmount();

      expect(getChanged()).toBe(true);
    });

    it('keeps `changed` on unmount after a browser `beforeunload` prompt', () => {
      const { unmount } = renderPromptHook();
      appLeaveHandler?.(actionsMock);

      unmount();

      expect(getChanged()).toBe(true);
    });

    it('does not prompt again after the user confirmed leaving', () => {
      const { unmount } = renderPromptHook();
      expect(leaveToOtherApp()).toEqual(
        expect.objectContaining({ type: AppLeaveActionType.confirm })
      );
      // Core navigates away on confirm, which unmounts the Timeline wrapper.
      unmount();

      renderPromptHook();
      expect(leaveToOtherApp()).toEqual({ type: AppLeaveActionType.default });
    });
  });
});
