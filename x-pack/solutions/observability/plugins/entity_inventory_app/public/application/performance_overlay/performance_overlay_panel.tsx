/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { css } from '@emotion/react';
import { EuiButton, EuiPortal, useEuiTheme } from '@elastic/eui';
import useObservable from 'react-use/lib/useObservable';
import { getEbtProps } from '@kbn/ebt-click';
import { ENTITY_INVENTORY_EBT_ACTIONS, ENTITY_INVENTORY_EBT_ELEMENTS } from '../../ebt_constants';
import { formatMs } from './format';
import type { PerformanceRecorder } from './performance_recorder';
import { PerformanceFlyout } from './performance_flyout';
import { BADGE_ARIA_LABEL, BADGE_LABEL } from './translations';

export interface PerformanceOverlayPanelProps {
  recorder: PerformanceRecorder;
}

/** A fixed corner badge with the last `_list` browser time, opening the performance flyout. */
export const PerformanceOverlayPanel = ({ recorder }: PerformanceOverlayPanelProps) => {
  const { euiTheme } = useEuiTheme();
  const calls = useObservable(recorder.calls$, recorder.getCalls());
  const [isFlyoutOpen, setIsFlyoutOpen] = useState(false);
  const lastList = calls.find(({ list }) => list !== null);

  const badgeCss = css`
    position: fixed;
    bottom: ${euiTheme.size.m};
    left: ${euiTheme.size.m};
    z-index: ${euiTheme.levels.menu};
  `;

  return (
    <>
      <EuiPortal>
        <div css={badgeCss}>
          <EuiButton
            size="s"
            color="text"
            iconType="clock"
            aria-label={BADGE_ARIA_LABEL}
            data-test-subj="entityInventoryPerformanceBadge"
            {...getEbtProps({
              action: ENTITY_INVENTORY_EBT_ACTIONS.TOGGLE_PERFORMANCE_OVERLAY,
              element: ENTITY_INVENTORY_EBT_ELEMENTS.PERFORMANCE_OVERLAY,
            })}
            onClick={() => setIsFlyoutOpen((open) => !open)}
          >
            {BADGE_LABEL(formatMs(lastList?.browserMs ?? null))}
          </EuiButton>
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
