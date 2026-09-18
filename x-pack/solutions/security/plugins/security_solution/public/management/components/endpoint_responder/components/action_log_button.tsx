/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useRef, useState } from 'react';
import { css } from '@emotion/react';
import {
  EuiButton,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { EndpointResponderExtensionComponentProps } from '../types';
import { useManagedContextFlyoutZIndex } from '../../../../common/hooks/use_managed_context_flyout_z_index';
import { ResponseActionsLog } from '../../endpoint_response_actions_list/response_actions_log';
import { UX_MESSAGES } from '../../endpoint_response_actions_list/translations';

export const ActionLogButton = memo<EndpointResponderExtensionComponentProps>((props) => {
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const [showActionLogFlyout, setShowActionLogFlyout] = useState<boolean>(false);
  const toggleActionLog = useCallback(() => {
    setShowActionLogFlyout((prevState) => {
      // When closing, restore focus to the trigger button so EUI's focus trap
      // doesn't return focus to <body> (which surfaces the global SkipLink).
      if (prevState) {
        window.requestAnimationFrame(() => buttonRef.current?.focus());
      }
      return !prevState;
    });
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

  return (
    <>
      <EuiButton
        buttonRef={buttonRef}
        onClick={toggleActionLog}
        disabled={showActionLogFlyout}
        iconType="listBullet"
        data-test-subj="responderShowActionLogButton"
      >
        <FormattedMessage
          id="xpack.securitySolution.responseActionsHistoryButton.label"
          defaultMessage="Response actions history"
        />
      </EuiButton>
      {showActionLogFlyout && (
        <EuiFlyout
          onClose={toggleActionLog}
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
              <h1 id={responderActionLogFlyoutTitleId}>
                {UX_MESSAGES.flyoutTitle(props.meta.hostName)}
              </h1>
            </EuiTitle>
          </EuiFlyoutHeader>
          <EuiFlyoutBody>
            <ResponseActionsLog agentIds={props.meta.agentId} />
          </EuiFlyoutBody>
        </EuiFlyout>
      )}
    </>
  );
});
ActionLogButton.displayName = 'ActionLogButton';
