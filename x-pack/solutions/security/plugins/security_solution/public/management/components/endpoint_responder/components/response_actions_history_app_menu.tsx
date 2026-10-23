/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { css } from '@emotion/react';
import {
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { AppMenuConfig, AppMenuRunActionParams } from '@kbn/app-menu';
import type { EndpointResponderHeaderActionsComponentProps } from '../types';
import { useManagedContextFlyoutZIndex } from '../../../../common/hooks/use_managed_context_flyout_z_index';
import { ResponseActionsLog } from '../../endpoint_response_actions_list/response_actions_log';
import { UX_MESSAGES } from '../../endpoint_response_actions_list/translations';

const RESPONSE_ACTIONS_HISTORY_LABEL = i18n.translate(
  'xpack.securitySolution.responseActionsHistoryButton.label',
  { defaultMessage: 'Response actions history' }
);

/** Preserved from the previous `ActionLogButton` trigger's `data-test-subj`. */
export const RESPONSE_ACTIONS_HISTORY_MENU_ITEM_TEST_ID = 'responderShowActionLogButton';

export type ResponseActionsHistoryAppMenuProps = EndpointResponderHeaderActionsComponentProps;

/**
 * Contributes the "Response actions history" primary action to the response console overlay's
 * header (the `HeaderActionsComponent` registered in `use_with_show_responder.tsx`).
 *
 * This component does not render the trigger button itself - the overlay's header renders it
 * declaratively from the `AppMenuConfig` reported through `onMenuChange`. This component owns only
 * what's left over: the flyout the action opens.
 */
export const ResponseActionsHistoryAppMenu = memo<ResponseActionsHistoryAppMenuProps>(
  ({ meta, onMenuChange }) => {
    const [showActionLogFlyout, setShowActionLogFlyout] = useState<boolean>(false);
    const returnFocusRef = useRef<(() => void) | undefined>();

    const closeFlyout = useCallback(() => {
      setShowActionLogFlyout(false);
      // Restore focus to the app menu control that opened the flyout, mirroring the previous
      // manual `buttonRef`/`requestAnimationFrame` focus-restoration hack.
      returnFocusRef.current?.();
      returnFocusRef.current = undefined;
    }, []);

    const openFlyout = useCallback((params?: AppMenuRunActionParams) => {
      returnFocusRef.current = params?.returnFocus;
      setShowActionLogFlyout(true);
    }, []);

    const responderActionLogFlyoutTitleId = useGeneratedHtmlId({
      prefix: 'responderActionLogFlyoutTitle',
    });

    // Only set when this flyout is rendered *inside* a managed flyout subtree (eg the console was
    // opened from a new-system flyout, as in Discover). In that case EUI would otherwise pin the
    // flyout behind the console overlay, so we slot it back above the overlay ourselves. When it
    // renders standalone (eg the Security Solution app shell) this is `undefined` and EUI's default
    // unmanaged-flyout stacking already puts it in the right place.
    const managedContextZIndex = useManagedContextFlyoutZIndex(showActionLogFlyout);

    const menu = useMemo<AppMenuConfig>(
      () => ({
        primaryActionItem: {
          id: 'responseActionsHistory',
          label: RESPONSE_ACTIONS_HISTORY_LABEL,
          iconType: 'listBullet',
          run: openFlyout,
          disableButton: showActionLogFlyout,
          testId: RESPONSE_ACTIONS_HISTORY_MENU_ITEM_TEST_ID,
        },
      }),
      [openFlyout, showActionLogFlyout]
    );

    useEffect(() => {
      onMenuChange(menu);
    }, [menu, onMenuChange]);

    // Clear the contributed menu on unmount (eg. the console is terminated, or a different console
    // becomes visible) so the header never keeps a trigger around whose handler is gone.
    useEffect(() => {
      return () => onMenuChange(undefined);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    if (!showActionLogFlyout) {
      return null;
    }

    return (
      <EuiFlyout
        onClose={closeFlyout}
        size="m"
        paddingSize="l"
        aria-labelledby={responderActionLogFlyoutTitleId}
        data-test-subj="responderActionLogFlyout"
        // Opt out of session management so this always renders as a standalone unmanaged flyout.
        // As an unmanaged flyout it captures EUI's shared `currentZIndex` on open - which the
        // console overlay has already bumped by registering itself - so it naturally stacks above
        // the overlay (and its mask above the overlay too), in both the new and legacy flyout modes.
        session="never"
        // When rendered inside a managed flyout (see `useManagedContextFlyoutZIndex`), EUI can't
        // slot us into the shared sequence, so we apply the computed z-index explicitly to both
        // the panel and its mask, keeping the mask just above the overlay and below the panel.
        css={
          managedContextZIndex != null
            ? css`
                z-index: ${managedContextZIndex} !important;
              `
            : undefined
        }
        maskProps={
          managedContextZIndex != null
            ? { style: `z-index: ${managedContextZIndex - 1} !important` }
            : undefined
        }
      >
        <EuiFlyoutHeader hasBorder>
          <EuiTitle size="m">
            <h1 id={responderActionLogFlyoutTitleId}>{UX_MESSAGES.flyoutTitle(meta.hostName)}</h1>
          </EuiTitle>
        </EuiFlyoutHeader>
        <EuiFlyoutBody>
          <ResponseActionsLog agentIds={meta.agentId} />
        </EuiFlyoutBody>
      </EuiFlyout>
    );
  }
);
ResponseActionsHistoryAppMenu.displayName = 'ResponseActionsHistoryAppMenu';
