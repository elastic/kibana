/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, EuiToolTip } from '@elastic/eui';
import type { EuiBadgeProps } from '@elastic/eui';
import type { PndRunStatus } from '@kbn/pnd-common';
import * as i18n from './translations';

/**
 * The six members of the generated `PndRunStatus`. Kept as a local list so the
 * badge can be exhaustive at the type level; `getRunStatusPresentation` indexes
 * the record with the generated union, so a contract change fails the type check
 * here instead of silently falling back at runtime.
 */
export const PND_RUN_STATUSES = [
  'cancelled',
  'failed',
  'running',
  'succeeded',
  'timed_out',
  'waiting_for_input',
] as const;

export type PndRunStatusName = (typeof PND_RUN_STATUSES)[number];

export interface RunStatusPresentation {
  color: NonNullable<EuiBadgeProps['color']>;
  /** Longer copy: the badge tooltip in the runs table. */
  description: string;
  iconType: string;
  label: string;
}

export const RUN_STATUS_PRESENTATION: Record<PndRunStatusName, RunStatusPresentation> = {
  cancelled: {
    color: 'hollow',
    description: i18n.CANCELLED_DESCRIPTION,
    iconType: 'cross',
    label: i18n.CANCELLED_LABEL,
  },
  failed: {
    color: 'danger',
    description: i18n.FAILED_DESCRIPTION,
    iconType: 'error',
    label: i18n.FAILED_LABEL,
  },
  running: {
    color: 'primary',
    description: i18n.RUNNING_DESCRIPTION,
    iconType: 'clock',
    label: i18n.RUNNING_LABEL,
  },
  succeeded: {
    color: 'success',
    description: i18n.SUCCEEDED_DESCRIPTION,
    iconType: 'check',
    label: i18n.SUCCEEDED_LABEL,
  },
  // A timeout is a failure, so it keeps a failure color — but it is a different
  // failure from an error, and the runs table has to say which one it was.
  timed_out: {
    color: 'risk',
    description: i18n.TIMED_OUT_DESCRIPTION,
    iconType: 'clockCounter',
    label: i18n.TIMED_OUT_LABEL,
  },
  // The one status an analyst can act on, so it gets the attention color.
  waiting_for_input: {
    color: 'warning',
    description: i18n.WAITING_FOR_INPUT_DESCRIPTION,
    iconType: 'user',
    label: i18n.WAITING_FOR_INPUT_LABEL,
  },
};

/** Never `success`: an unrecognized status must not read as a clean run. */
const unknownPresentation = (status: string): RunStatusPresentation => ({
  color: 'default',
  description: i18n.unknownDescription(status),
  iconType: 'questionInCircle',
  label: i18n.UNKNOWN_LABEL,
});

export const getRunStatusPresentation = (
  status: PndRunStatus | PndRunStatusName
): RunStatusPresentation => RUN_STATUS_PRESENTATION[status] ?? unknownPresentation(status);

export interface RunStatusBadgeProps {
  'data-test-subj'?: string;
  status: PndRunStatus | PndRunStatusName;
}

export const RunStatusBadge: React.FC<RunStatusBadgeProps> = ({
  'data-test-subj': dataTestSubj = 'pndRunStatusBadge',
  status,
}) => {
  const { color, description, iconType, label } = getRunStatusPresentation(status);

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
