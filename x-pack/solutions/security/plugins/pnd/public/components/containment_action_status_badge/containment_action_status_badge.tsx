/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, EuiToolTip } from '@elastic/eui';
import type { EuiBadgeProps } from '@elastic/eui';
import * as i18n from './translations';

/**
 * Every status the Watch Floor's per-action containment ledger records. The ledger is loose —
 * `collect_executed_actions` writes `Record<string, unknown>` entries — so unlike the phase-step
 * badge there is no generated union to be exhaustive against; unknown members fall back to an
 * explicit unknown treatment instead of failing the type check.
 */
export const PND_CONTAINMENT_ACTION_STATUSES = [
  'failed',
  'not_executed',
  'skipped',
  'submitted',
  'succeeded',
] as const;

export type PndContainmentActionStatusName = (typeof PND_CONTAINMENT_ACTION_STATUSES)[number];

export interface ContainmentActionStatusPresentation {
  color: NonNullable<EuiBadgeProps['color']>;
  /** Longer copy: the badge tooltip. */
  description: string;
  iconType: string;
  label: string;
}

/**
 * The copy and treatment contract for the five ledger statuses.
 *
 * `submitted` shares the success tone with `succeeded`: the hand-off to the target system is the
 * outcome PND can vouch for, and rendering it as pending would read as though PND still had work to
 * do. `not_executed` stays neutral — an action the gate never approved is not a failure.
 */
export const CONTAINMENT_ACTION_STATUS_PRESENTATION: Record<
  PndContainmentActionStatusName,
  ContainmentActionStatusPresentation
> = {
  failed: {
    color: 'danger',
    description: i18n.FAILED_DESCRIPTION,
    iconType: 'error',
    label: i18n.FAILED_LABEL,
  },
  not_executed: {
    color: 'default',
    description: i18n.NOT_EXECUTED_DESCRIPTION,
    iconType: 'dot',
    label: i18n.NOT_EXECUTED_LABEL,
  },
  skipped: {
    color: 'warning',
    description: i18n.SKIPPED_DESCRIPTION,
    iconType: 'minusInCircle',
    label: i18n.SKIPPED_LABEL,
  },
  submitted: {
    color: 'success',
    description: i18n.SUBMITTED_DESCRIPTION,
    iconType: 'export',
    label: i18n.SUBMITTED_LABEL,
  },
  succeeded: {
    color: 'success',
    description: i18n.SUCCEEDED_DESCRIPTION,
    iconType: 'check',
    label: i18n.SUCCEEDED_LABEL,
  },
};

const isKnownStatus = (status: string): status is PndContainmentActionStatusName =>
  (PND_CONTAINMENT_ACTION_STATUSES as readonly string[]).includes(status);

/**
 * Presentation for a status the UI does not know. Never `success`: an unrecognized status is the
 * one case where guessing "it worked" is unsafe.
 */
const unknownPresentation = (status: string): ContainmentActionStatusPresentation => ({
  color: 'default',
  description: i18n.unknownDescription(status),
  iconType: 'questionInCircle',
  label: i18n.UNKNOWN_LABEL,
});

export const getContainmentActionStatusPresentation = (
  status: string
): ContainmentActionStatusPresentation =>
  isKnownStatus(status)
    ? CONTAINMENT_ACTION_STATUS_PRESENTATION[status]
    : unknownPresentation(status);

export interface ContainmentActionStatusBadgeProps {
  'data-test-subj'?: string;
  status: string;
}

export const ContainmentActionStatusBadge: React.FC<ContainmentActionStatusBadgeProps> = ({
  'data-test-subj': dataTestSubj = 'pndContainmentActionStatusBadge',
  status,
}) => {
  const { color, description, iconType, label } = getContainmentActionStatusPresentation(status);

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
