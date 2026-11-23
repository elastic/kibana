/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { css } from '@emotion/react';
import { EuiButton, EuiPortal, EuiToolTip, useEuiTheme } from '@elastic/eui';
import useObservable from 'react-use/lib/useObservable';
import { getEbtProps } from '@kbn/ebt-click';
import { ENTITY_INVENTORY_EBT_ACTIONS, ENTITY_INVENTORY_EBT_ELEMENTS } from '../../ebt_constants';
import { formatMs, formatRequest } from './format';
import type { PerformanceRecorder } from './performance_recorder';
import { PerformanceFlyout } from './performance_flyout';
import { BADGE_LABEL, BADGE_TOOLTIP, BADGE_TOOLTIP_EMPTY } from './translations';

export interface PerformanceOverlayPanelProps {
  recorder: PerformanceRecorder;
}

/** A fixed corner badge with the browser round trip of the latest inventory call, opening the performance flyout. */
export const PerformanceOverlayPanel = ({ recorder }: PerformanceOverlayPanelProps) => {
  const { euiTheme } = useEuiTheme();
  const calls = useObservable(recorder.calls$, recorder.getCalls());
  const [isFlyoutOpen, setIsFlyoutOpen] = useState(false);
  // The recorder keeps the newest call first.
  const [latest] = calls;

  const badgeCss = css`
    position: fixed;
    /* The 24px Developer Toolbar, then the usual offset above it. */
    bottom: calc(24px + ${euiTheme.size.m});
    /* Clear of the dev server's status dot in the bottom-right corner. */
    right: calc(${euiTheme.size.xxl} + ${euiTheme.size.s});
    z-index: ${euiTheme.levels.menu};
  `;

  return (
    <>
      <EuiPortal>
        <div css={badgeCss}>
          <EuiToolTip
            position="left"
            content={latest ? BADGE_TOOLTIP(formatRequest(latest.route)) : BADGE_TOOLTIP_EMPTY}
          >
            <EuiButton
              size="s"
              color="text"
              iconType="clock"
              data-test-subj="entityInventoryPerformanceBadge"
              {...getEbtProps({
                action: ENTITY_INVENTORY_EBT_ACTIONS.TOGGLE_PERFORMANCE_OVERLAY,
                element: ENTITY_INVENTORY_EBT_ELEMENTS.PERFORMANCE_OVERLAY,
              })}
              onClick={() => setIsFlyoutOpen((open) => !open)}
            >
              {BADGE_LABEL(formatMs(latest?.browserMs ?? null))}
            </EuiButton>
          </EuiToolTip>
        </div>
      </EuiPortal>
      {isFlyoutOpen && (
        <PerformanceFlyout
          calls={calls}
          onClear={recorder.clear}
          onClose={() => setIsFlyoutOpen(false)}
        />
      )}
    </>
  );
};
