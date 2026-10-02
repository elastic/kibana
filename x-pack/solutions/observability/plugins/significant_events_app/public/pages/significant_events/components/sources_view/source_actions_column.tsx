/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonIcon, EuiFlexGroup, EuiFlexItem, EuiToolTip } from '@elastic/eui';
import type { NightshiftSource } from '@kbn/nightshift-shared';
import {
  SignificantEventsWorkflowStatus,
  type SignificantEventsWorkflowStatusResult,
} from '@kbn/significant-events-schema';
import React from 'react';
import {
  DELETE_SOURCE_ACTION_DESCRIPTION,
  DELETE_SOURCE_ACTION_LABEL,
  ENABLE_SOURCE_TO_ONBOARD_TOOLTIP,
  RUN_SOURCE_ONBOARDING_BUTTON_LABEL,
  STOP_SOURCE_ONBOARDING_BUTTON_LABEL,
} from './translations';
import { isOnboardingInProgress } from './utils';

interface SourceActionsColumnProps {
  source: NightshiftSource;
  onboardingStatus?: SignificantEventsWorkflowStatusResult['status'];
  /** Global pause or unknown activity status: onboarding cannot start. */
  blocksActivity: boolean;
  onboardTooltip: string;
  onOnboard: (sourceId: string) => void;
  onStopOnboarding: (sourceId: string) => void;
  onDelete: (source: NightshiftSource) => void;
}

/**
 * Row actions as plain buttons. EUI's actions column folds more than two actions into a
 * popover, and every source has three.
 */
export function SourceActionsColumn({
  source,
  onboardingStatus,
  blocksActivity,
  onboardTooltip,
  onOnboard,
  onStopOnboarding,
  onDelete,
}: SourceActionsColumnProps) {
  return (
    <EuiFlexGroup
      data-test-subj={`significantEventsAppSourceActions-${source.id}`}
      gutterSize="xs"
      responsive={false}
      wrap={false}
    >
      <EuiFlexItem grow={false}>
        {isOnboardingInProgress(onboardingStatus) ? (
          <EuiToolTip content={STOP_SOURCE_ONBOARDING_BUTTON_LABEL} disableScreenReaderOutput>
            <EuiButtonIcon
              data-test-subj="significantEventsAppSourcesTableStopButton"
              iconType="stop"
              aria-label={STOP_SOURCE_ONBOARDING_BUTTON_LABEL}
              isDisabled={onboardingStatus === SignificantEventsWorkflowStatus.BeingCanceled}
              onClick={() => onStopOnboarding(source.id)}
            />
          </EuiToolTip>
        ) : (
          <EuiToolTip content={source.enabled ? onboardTooltip : ENABLE_SOURCE_TO_ONBOARD_TOOLTIP}>
            <EuiButtonIcon
              data-test-subj="significantEventsAppSourcesTableOnboardButton"
              iconType="radar"
              aria-label={RUN_SOURCE_ONBOARDING_BUTTON_LABEL}
              // The onboarding route rejects disabled sources.
              isDisabled={!source.enabled || blocksActivity}
              onClick={() => onOnboard(source.id)}
            />
          </EuiToolTip>
        )}
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiToolTip content={DELETE_SOURCE_ACTION_DESCRIPTION}>
          <EuiButtonIcon
            data-test-subj="significantEventsAppSourcesTableDeleteButton"
            iconType="trash"
            color="danger"
            aria-label={DELETE_SOURCE_ACTION_LABEL}
            onClick={() => onDelete(source)}
          />
        </EuiToolTip>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
