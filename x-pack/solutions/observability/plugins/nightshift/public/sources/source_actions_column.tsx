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
import React, { useState } from 'react';
import {
  DELETE_SOURCE_ACTION_DESCRIPTION,
  DELETE_SOURCE_ACTION_LABEL,
  ENABLE_SOURCE_TO_ONBOARD_TOOLTIP,
  ONBOARDING_STARTING_TOOLTIP,
  RUN_SOURCE_ONBOARDING_BUTTON_LABEL,
  STOP_SOURCE_ONBOARDING_BUTTON_LABEL,
} from './translations';
import { isOnboardingInProgress } from './utils';

interface SourceActionsColumnProps {
  source: NightshiftSource;
  onboardingStatus?: SignificantEventsWorkflowStatusResult['status'];
  /** Global pause or unknown activity status: onboarding cannot start. */
  blocksActivity: boolean;
  /** Run expected but not reported yet: a schedule in flight or a just-created or edited source. */
  isOnboardPending: boolean;
  onboardTooltip: string;
  onOnboard: (sourceId: string) => void;
  onStopOnboarding: (sourceId: string) => void | Promise<void>;
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
  isOnboardPending,
  onboardTooltip,
  onOnboard,
  onStopOnboarding,
  onDelete,
}: SourceActionsColumnProps) {
  const [isStopPending, setIsStopPending] = useState(false);
  // A resolved cancel stays InProgress until the next poll. Drop the lock once status moves on,
  // so a later run of this source is not stuck with a disabled stop button.
  if (isStopPending && onboardingStatus !== SignificantEventsWorkflowStatus.InProgress) {
    setIsStopPending(false);
  }

  const isRunActive = isOnboardingInProgress(onboardingStatus);
  // Pending covers the gap before status reports the run, e.g. a just-created source whose run the
  // server has not started yet. There is nothing to cancel then, so Stop shows but stays disabled.
  const isRunStarting = isOnboardPending && !isRunActive;

  const handleStopOnboarding = async () => {
    setIsStopPending(true);
    try {
      await onStopOnboarding(source.id);
    } catch {
      // Status will not move, so the button has to accept another attempt.
      setIsStopPending(false);
    }
  };

  return (
    <EuiFlexGroup
      data-test-subj={`significantEventsAppSourceActions-${source.id}`}
      gutterSize="xs"
      responsive={false}
      wrap={false}
    >
      <EuiFlexItem grow={false}>
        {isRunActive || isRunStarting ? (
          <EuiToolTip
            content={
              isRunStarting ? ONBOARDING_STARTING_TOOLTIP : STOP_SOURCE_ONBOARDING_BUTTON_LABEL
            }
            disableScreenReaderOutput
          >
            <EuiButtonIcon
              data-test-subj="significantEventsAppSourcesTableStopButton"
              iconType="stop"
              aria-label={STOP_SOURCE_ONBOARDING_BUTTON_LABEL}
              isDisabled={
                isRunStarting ||
                isStopPending ||
                onboardingStatus === SignificantEventsWorkflowStatus.BeingCanceled
              }
              onClick={() => {
                void handleStopOnboarding();
              }}
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
