/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFocusTrap, EuiWindowEvent, getFlyoutManagerStore, keys } from '@elastic/eui';
import React, { useCallback, useMemo, useRef } from 'react';
import type { AppLeaveHandler } from '@kbn/core/public';
import { useDispatch } from 'react-redux';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { TimelineModal } from '../components/modal';
import type { TimelineId } from '../../../common/types';
import { useDeepEqualSelector } from '../../common/hooks/use_selector';
import { TimelineBottomBar } from '../components/bottom_bar';
import { getTimelineShowStatusByIdSelector } from '../store/selectors';
import { useTimelineSavePrompt } from '../../common/hooks/timeline/use_timeline_save_prompt';
import { timelineActions } from '../store';
import { isTimelineFlyoutOpen } from '../../flyout/document_details/shared/hooks/use_which_flyout';
import { useIsNewFlyoutEnabled } from '../../common/hooks/use_is_new_flyout_enabled';
import { timelineFlyoutHistoryKey } from '../../flyout_v2/shared/constants/flyout_history';

interface TimelineWrapperProps {
  /**
   * Id of the current timeline
   */
  timelineId: TimelineId;
  /**
   * Allows to prompt a save modal when the user tries to leave the Security Solution app
   * @param handler
   */
  onAppLeave: (handler: AppLeaveHandler) => void;
}

/**
 * This component renders the timeline EuiPortal as well as the bottom bar, and handles the interaction between the two.
 * Using EuiFocusTrap, we can trap the focus within the portal when it is open, which prevents closing the portal when clicking outside of it.
 */
export const TimelineWrapper: React.FC<TimelineWrapperProps> = React.memo(
  ({ timelineId, onAppLeave }) => {
    const getTimelineShowStatus = useMemo(() => getTimelineShowStatusByIdSelector(), []);
    const { show } = useDeepEqualSelector((state) => getTimelineShowStatus(state, timelineId));
    const dispatch = useDispatch();
    const openToggleRef = useRef(null);
    const handleClose = useCallback(() => {
      dispatch(timelineActions.showTimeline({ id: timelineId, show: false }));
    }, [dispatch, timelineId]);
    const { closeFlyout } = useExpandableFlyoutApi();
    const newFlyoutSystemEnabled = useIsNewFlyoutEnabled();

    // pressing the ESC key closes the timeline portal unless a flyout is opened on top of it
    const onKeyDown = useCallback(
      (ev: KeyboardEvent) => {
        if (ev.key !== keys.ESCAPE) {
          return;
        }

        if (newFlyoutSystemEnabled) {
          if (!show) {
            // Timeline isn't visible: let flyouts' own Esc handling run normally.
            return;
          }

          const { sessions } = getFlyoutManagerStore().getState();
          const topSession = sessions[sessions.length - 1];
          // Flyouts opened from *within* Timeline (eg from its table) are given
          // `timelineFlyoutHistoryKey`
          const topSessionOpenedFromTimeline = topSession?.historyKey === timelineFlyoutHistoryKey;

          // Each managed flyout registers its own window-level Esc handler, but its
          // "should I close on Esc" decision is based on the *globally* topmost session.
          // Without stopping propagation here, a flyout that was already open *underneath*
          // Timeline could incorrectly close itself on the same keypress as the block below.
          ev.stopImmediatePropagation();
          ev.preventDefault();

          if (topSession && topSessionOpenedFromTimeline) {
            const store = getFlyoutManagerStore();

            if (topSession.childFlyoutId) {
              // Drill down into the child flyout first, same as EuiManagedFlyout's own
              // `onClose` does for a child-level flyout (`closeFlyout(id)`).
              store.closeFlyout(topSession.childFlyoutId);
            } else {
              // No child left: this main flyout closes next. Mirror EuiManagedFlyout's own
              // `onClose` for a *main*-level flyout
              store.closeAllFlyouts();
            }
            return;
          }

          // Nothing left on top that was opened from within Timeline: Timeline is now the
          // topmost surface, so it closes next. Any flyout that was already open underneath it
          // (before Timeline was shown) is left untouched until the next Esc press.
          handleClose();
          return;
        }

        const query = new URLSearchParams(window.location.search);
        const timelineFlyoutOpen = isTimelineFlyoutOpen(query);

        // While the Timeline modal is visible, keep this Esc keydown from reaching the
        // window-level handler of the underlying expandable flyout (e.g. the graph
        // investigation view), which would otherwise also close it. Both listeners are
        // registered on `window`, so `stopImmediatePropagation` (not `stopPropagation`)
        // is required to suppress the sibling listener. We skip this when the Timeline is
        // not visible so Esc still closes flyouts on other pages.
        if (show) {
          ev.stopImmediatePropagation();
          ev.preventDefault();
        }

        if (timelineFlyoutOpen) {
          closeFlyout();
          return;
        }
        handleClose();
      },
      [show, newFlyoutSystemEnabled, closeFlyout, handleClose]
    );

    useTimelineSavePrompt(timelineId, onAppLeave);

    return (
      <>
        <EuiFocusTrap disabled={!show}>
          <TimelineModal timelineId={timelineId} visible={show} openToggleRef={openToggleRef} />
        </EuiFocusTrap>
        <TimelineBottomBar show={show} timelineId={timelineId} openToggleRef={openToggleRef} />
        <EuiWindowEvent event="keydown" handler={onKeyDown} />
      </>
    );
  }
);

TimelineWrapper.displayName = 'TimelineWrapper';
