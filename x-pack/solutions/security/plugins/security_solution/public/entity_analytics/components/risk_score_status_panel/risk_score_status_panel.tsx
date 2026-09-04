/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButton,
  EuiCallOut,
  EuiEmptyPrompt,
  EuiSpacer,
  EuiText,
  EuiTextColor,
  type IconType,
} from '@elastic/eui';
import { FactsList } from './facts_list';
import { copyForReason } from './translations';
import type {
  RiskScoreStatusAction,
  RiskScoreStatusPanelProps,
  RiskScoreStatusReason,
} from './types';

const ICON_BY_REASON: Record<RiskScoreStatusReason, IconType> = {
  no_matching_alerts: 'clock',
  engine_never_run: 'play',
  engine_disabled: 'eyeClosed',
  engine_not_installed: 'package',
  unknown: 'questionInCircle',
};

const COLOR_BY_REASON: Record<RiskScoreStatusReason, 'primary' | 'warning'> = {
  no_matching_alerts: 'primary',
  engine_never_run: 'primary',
  engine_disabled: 'warning',
  engine_not_installed: 'warning',
  unknown: 'primary',
};

/**
 * Empty / degraded-state panel for risk-score surfaces.
 *
 * One reusable component that explains *why* a risk-score chart, table or
 * preview is empty, and gives the user a clear next step. Designed to be
 * dropped into multiple surfaces (home page donut, management page preview,
 * combined donut, entity flyout) so the vocabulary stays consistent.
 *
 * The component does not query anything itself — pair it with
 * {@link useRiskScoreStatus} (or another caller-side computation) to derive
 * the `reason` and `facts`.
 */
export const RiskScoreStatusPanel: React.FC<RiskScoreStatusPanelProps> = ({
  reason,
  facts,
  primaryAction,
  variant = 'panel',
  title,
  description,
  'data-test-subj': dataTestSubj = 'risk-score-status-panel',
}) => {
  const copy = copyForReason(reason);
  const icon = ICON_BY_REASON[reason];
  const resolvedTitle = title ?? copy.title;
  const resolvedDescription = description ?? copy.description;
  const resolvedAction = resolveAction(primaryAction);

  if (variant === 'inline') {
    return (
      <EuiText size="s" data-test-subj={dataTestSubj}>
        <EuiTextColor color="subdued">{resolvedDescription}</EuiTextColor>
      </EuiText>
    );
  }

  const body = (
    <>
      <EuiText size="s">
        <EuiTextColor color="subdued">{resolvedDescription}</EuiTextColor>
      </EuiText>
      {facts ? (
        <>
          <EuiSpacer size="m" />
          <FactsList facts={facts} data-test-subj={`${dataTestSubj}-facts`} />
        </>
      ) : null}
      {resolvedAction ? (
        <>
          <EuiSpacer size="m" />
          <EuiButton
            iconType="arrowRight"
            iconSide="right"
            onClick={resolvedAction.onClick}
            data-test-subj={resolvedAction['data-test-subj'] ?? `${dataTestSubj}-primaryAction`}
          >
            {resolvedAction.label}
          </EuiButton>
        </>
      ) : null}
    </>
  );

  if (variant === 'callout') {
    return (
      <EuiCallOut
        title={resolvedTitle}
        color={COLOR_BY_REASON[reason]}
        iconType={icon}
        data-test-subj={dataTestSubj}
      >
        {body}
      </EuiCallOut>
    );
  }

  return (
    <EuiEmptyPrompt
      iconType={icon}
      iconColor="subdued"
      titleSize="s"
      title={<h3>{resolvedTitle}</h3>}
      body={body}
      paddingSize="m"
      data-test-subj={dataTestSubj}
    />
  );
};

/**
 * `primaryAction` semantics:
 * - `undefined` → use the default action (left for the caller to wire up via
 *   props in a follow-up; today the component shows nothing).
 * - `null` → explicitly suppress the action (e.g. already on the destination).
 * - object → render with the supplied label and `onClick`.
 *
 * The component intentionally has no built-in navigation default to keep it
 * decoupled from the router; that wiring belongs at the call site.
 */
const resolveAction = (
  primaryAction: RiskScoreStatusPanelProps['primaryAction']
): RiskScoreStatusAction | undefined => {
  if (primaryAction === null) {
    return undefined;
  }
  return primaryAction ?? undefined;
};
