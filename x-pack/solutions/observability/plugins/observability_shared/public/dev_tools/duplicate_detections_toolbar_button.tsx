/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Observable } from 'rxjs';
import useObservable from 'react-use/lib/useObservable';
import { EuiBadge, EuiButtonIcon, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import type { DuplicateDetectionEvent } from './duplicate_detections_toast';
import type { DetectorSettings } from './duplicate_detections_settings';

const EMPTY_EVENTS: DuplicateDetectionEvent[] = [];

export interface DuplicateDetectionsToolbarButtonProps {
  /** Live stream of detection events – drives the count badge. */
  events$: Observable<DuplicateDetectionEvent[]>;
  /** Live stream of detector settings – used to indicate paused state. */
  settings$: Observable<DetectorSettings>;
  /** Click handler – opens the flyout (no arguments needed; the manager picks the anchor). */
  onOpenFlyout: () => void;
}

/**
 * Tiny icon that lives in the developer toolbar (bottom of the Kibana shell)
 * whenever the duplicate request detector is active. It:
 *
 * - Always shows a small "duplicate" icon so developers know the detector is
 *   running, even when the toast has been dismissed or auto-expired.
 * - Overlays a notification badge with the number of buffered events.
 * - Greys out / changes icon when detection is paused, providing a single
 *   discoverable entry point to re-enable the feature (you click → flyout
 *   opens → Settings tab → toggle on).
 * - Click opens the same consolidated flyout the toast's "View details"
 *   button does.
 */
export const DuplicateDetectionsToolbarButton: React.FC<DuplicateDetectionsToolbarButtonProps> = ({
  events$,
  settings$,
  onOpenFlyout,
}) => {
  const events = useObservable(events$, EMPTY_EVENTS);
  const settings = useObservable<DetectorSettings | undefined>(settings$);
  const isPaused = settings?.enabled === false;
  const count = events.length;

  const label = isPaused
    ? i18n.translate('xpack.observabilityShared.duplicateRequestDetector.toolbarPausedAriaLabel', {
        defaultMessage: 'Duplicate request detector (paused) – click to open',
      })
    : count === 0
    ? i18n.translate('xpack.observabilityShared.duplicateRequestDetector.toolbarIdleAriaLabel', {
        defaultMessage: 'Duplicate request detector – no detections yet',
      })
    : i18n.translate('xpack.observabilityShared.duplicateRequestDetector.toolbarActiveAriaLabel', {
        defaultMessage:
          '{count, plural, one {# duplicate request detection} other {# duplicate request detections}} – click to inspect',
        values: { count },
      });

  return (
    <EuiToolTip content={label} position="top">
      <span
        css={css`
          position: relative;
          display: inline-flex;
          align-items: center;
        `}
        data-test-subj="duplicateDetectionsToolbarButton"
      >
        <EuiButtonIcon
          iconType={isPaused ? 'eyeClosed' : 'inspect'}
          color="text"
          onClick={onOpenFlyout}
          aria-label={label}
          data-test-subj="duplicateDetectionsToolbarButtonIcon"
        />
        {count > 0 && !isPaused && (
          <EuiBadge
            color="danger"
            data-test-subj="duplicateDetectionsToolbarButtonBadge"
            // Positioned over the top-right corner of the icon button so the
            // badge reads like a notification dot without consuming horizontal
            // space in the (cramped) toolbar.
            css={css`
              position: absolute;
              top: -4px;
              right: -6px;
              padding: 0 4px;
              min-width: 18px;
              height: 16px;
              line-height: 16px;
              font-size: 10px;
              pointer-events: none;
            `}
          >
            {count > 99 ? '99+' : count}
          </EuiBadge>
        )}
      </span>
    </EuiToolTip>
  );
};
