/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, EuiToolTip } from '@elastic/eui';
import type { TimelineEvent } from '@kbn/pnd-common';
import { COVERAGE_GAP_CHIP } from '../translations';

/** Timeline events the server writes when a Detection Change Signal is attached. */
export const DETECTION_CHANGE_EVENT_TYPE = 'detection-change';

export interface CoverageGapChipProps {
  events: TimelineEvent[];
  'data-test-subj'?: string;
  /**
   * Called on click. Detection Watch reuses the SAME investigationId as the Dark/Deep/AD
   * worker that surfaced the gap (see `watch_dark_orchestrator.yaml`'s
   * `run_detection`/`route_rule_creation` steps) — so the resulting rule-creation/tuning
   * proposal lands on THIS investigation's Proposals tab, not a separate investigation.
   * Wire this to switch tabs rather than navigate cross-page.
   */
  onClick?: () => void;
}

/**
 * Renders a "Coverage gap" chip when the investigation carries one or more
 * Detection Change Signals (recorded as `detection-change` timeline events by
 * the Dark/Deep/AD workers). Renders nothing when there is no gap — the signal
 * is conditional by contract (#watch-floor: never a required field).
 */
export const CoverageGapChip: React.FC<CoverageGapChipProps> = ({
  events,
  'data-test-subj': dataTestSubj = 'pndCoverageGapChip',
  onClick,
}) => {
  const gapEvents = events.filter((event) => event.type === DETECTION_CHANGE_EVENT_TYPE);

  if (gapEvents.length === 0) {
    return null;
  }

  const label =
    gapEvents.length === 1
      ? COVERAGE_GAP_CHIP.LABEL
      : COVERAGE_GAP_CHIP.LABEL_PLURAL(gapEvents.length);

  const tooltip = onClick
    ? `${gapEvents.map((event) => event.summary).join(' · ')} — ${COVERAGE_GAP_CHIP.CLICK_HINT}`
    : gapEvents.map((event) => event.summary).join(' · ');

  const badge = onClick ? (
    <EuiBadge
      color="warning"
      iconType="warning"
      data-test-subj={dataTestSubj}
      onClick={onClick}
      onClickAriaLabel={COVERAGE_GAP_CHIP.CLICK_HINT}
    >
      {label}
    </EuiBadge>
  ) : (
    <EuiBadge color="warning" iconType="warning" data-test-subj={dataTestSubj}>
      {label}
    </EuiBadge>
  );

  return <EuiToolTip content={tooltip}>{badge}</EuiToolTip>;
};
