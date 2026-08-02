/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, EuiToolTip } from '@elastic/eui';
import type { EuiBadgeProps } from '@elastic/eui';
import type { PndPhaseStepStatus } from '@kbn/pnd-common';
import * as i18n from './translations';

/**
 * Every four-phase step status the UI can render.
 *
 * This matches the generated `PndPhaseStepStatus`. `getPhaseStepStatusPresentation`
 * indexes this record with the generated union too, so if the contract ever
 * renames a member the type check fails here rather than silently rendering a
 * fallback.
 */
export const PND_PHASE_STEP_STATUSES = [
  'completed',
  'failed',
  'not_started',
  'running',
  'skipped',
  'upstream',
  'waiting_for_input',
] as const;

export type PndPhaseStepStatusName = (typeof PND_PHASE_STEP_STATUSES)[number];

export interface PhaseStepStatusPresentation {
  color: NonNullable<EuiBadgeProps['color']>;
  /** Longer copy: the badge tooltip, and the detail line in the flyout. */
  description: string;
  iconType: string;
  label: string;
}

/**
 * The copy and treatment contract for the seven statuses.
 *
 * `upstream` must read as *someone else already did this*, never as success
 * and never as pending. Attack Discovery and existing Elastic Security perform
 * the work before PND is invoked, so there is no PND step execution to link —
 * but the work is real, which is why the copy names who does it.
 *
 * An answered gate is `completed`, whether a human or the auto-approver resumed
 * it. How it was answered is a different surface (the record's answered-by
 * line), never a second lifecycle status.
 */
export const PHASE_STEP_STATUS_PRESENTATION: Record<
  PndPhaseStepStatusName,
  PhaseStepStatusPresentation
> = {
  completed: {
    color: 'success',
    description: i18n.COMPLETED_DESCRIPTION,
    iconType: 'check',
    label: i18n.COMPLETED_LABEL,
  },
  failed: {
    color: 'danger',
    description: i18n.FAILED_DESCRIPTION,
    iconType: 'error',
    label: i18n.FAILED_LABEL,
  },
  not_started: {
    color: 'default',
    description: i18n.NOT_STARTED_DESCRIPTION,
    iconType: 'dot',
    label: i18n.NOT_STARTED_LABEL,
  },
  running: {
    color: 'primary',
    description: i18n.RUNNING_DESCRIPTION,
    iconType: 'clock',
    label: i18n.RUNNING_LABEL,
  },
  skipped: {
    color: 'hollow',
    description: i18n.SKIPPED_DESCRIPTION,
    iconType: 'minusInCircle',
    label: i18n.SKIPPED_LABEL,
  },
  upstream: {
    color: 'neutral',
    description: i18n.UPSTREAM_DESCRIPTION,
    iconType: 'importAction',
    label: i18n.UPSTREAM_LABEL,
  },
  waiting_for_input: {
    color: 'warning',
    description: i18n.WAITING_FOR_INPUT_DESCRIPTION,
    iconType: 'user',
    label: i18n.WAITING_FOR_INPUT_LABEL,
  },
};

/**
 * Presentation for a status the UI does not know. Never `success`: an
 * unrecognized status is the one case where guessing "it worked" is unsafe.
 */
const unknownPresentation = (status: string): PhaseStepStatusPresentation => ({
  color: 'default',
  description: i18n.unknownDescription(status),
  iconType: 'questionInCircle',
  label: i18n.UNKNOWN_LABEL,
});

export const getPhaseStepStatusPresentation = (
  status: PndPhaseStepStatus | PndPhaseStepStatusName
): PhaseStepStatusPresentation =>
  PHASE_STEP_STATUS_PRESENTATION[status] ?? unknownPresentation(status);

export interface PhaseStepStatusBadgeProps {
  'data-test-subj'?: string;
  status: PndPhaseStepStatus | PndPhaseStepStatusName;
}

export const PhaseStepStatusBadge: React.FC<PhaseStepStatusBadgeProps> = ({
  'data-test-subj': dataTestSubj = 'pndPhaseStepStatusBadge',
  status,
}) => {
  const { color, description, iconType, label } = getPhaseStepStatusPresentation(status);

  return (
    <EuiToolTip content={description}>
      {/* `tabIndex` so the tooltip is reachable by keyboard: the badge itself is not interactive. */}
      <EuiBadge
        color={color}
        data-status={status}
        data-test-subj={dataTestSubj}
        iconType={iconType}
        tabIndex={0}
      >
        {label}
      </EuiBadge>
    </EuiToolTip>
  );
};
