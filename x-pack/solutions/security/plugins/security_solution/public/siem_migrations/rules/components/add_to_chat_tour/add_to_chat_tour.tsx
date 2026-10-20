/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo } from 'react';
import type { EuiTourStepProps } from '@elastic/eui';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiDelayRender,
  EuiText,
  EuiTourStep,
  useEuiTheme,
} from '@elastic/eui';
import type { RuleMigrationRule } from '../../../../../common/siem_migrations/model/rule_migration.gen';
import {
  MigrationTranslationResult,
  SiemMigrationStatus,
} from '../../../../../common/siem_migrations/constants';
import { useKibana } from '../../../../common/lib/kibana';
import { useIsAnchorMounted } from '../../../../common/hooks/use_is_anchor_mounted';
import type { UseAddToChatTourStateResult } from './use_add_to_chat_tour_state';
import type { AddToChatTourStepNumber } from './constants';
import {
  ADD_TO_CHAT_TOUR_ANCHORS,
  ADD_TO_CHAT_TOUR_FLYOUT_STEP_DELAY_MS,
  ADD_TO_CHAT_TOUR_POPOVER_WIDTH,
  ADD_TO_CHAT_TOUR_STEPS_TOTAL,
  ADD_TO_CHAT_TOUR_TEST_ID,
} from './constants';
import {
  BULK_STEP_DESCRIPTION,
  BULK_STEP_TITLE,
  FINISH_BUTTON_LABEL,
  FLYOUT_STEP_DESCRIPTION,
  FLYOUT_STEP_TITLE,
  NEXT_BUTTON_LABEL,
  OPEN_RULE_BUTTON_LABEL,
  RULE_STEP_DESCRIPTION,
  RULE_STEP_TITLE,
  SKIP_BUTTON_LABEL,
} from './translations';

interface StepContent {
  title: string;
  description: string;
  anchorPosition: EuiTourStepProps['anchorPosition'];
}

const STEP_CONTENT: Record<AddToChatTourStepNumber, StepContent> = {
  1: { title: BULK_STEP_TITLE, description: BULK_STEP_DESCRIPTION, anchorPosition: 'downCenter' },
  2: { title: RULE_STEP_TITLE, description: RULE_STEP_DESCRIPTION, anchorPosition: 'rightCenter' },
  3: { title: FLYOUT_STEP_TITLE, description: FLYOUT_STEP_DESCRIPTION, anchorPosition: 'upCenter' },
};

interface ActiveStep {
  step: AddToChatTourStepNumber;
  anchor: string;
}

interface AddToChatTourProps {
  tour: UseAddToChatTourStateResult;
  migrationRules: RuleMigrationRule[];
  isTableLoaded: boolean;
  openedMigrationRuleId?: string;
  isOtherFlyoutOpen: boolean;
  openMigrationRuleDetails: (rule: RuleMigrationRule) => void;
}

/** Three-step "Add to chat" tour for the rule migrations table and the rule details flyout. */
export const AddToChatTour: React.FC<AddToChatTourProps> = ({
  tour: { tourState, goToStep, completeTour, setIsStepShowing },
  migrationRules,
  isTableLoaded,
  openedMigrationRuleId,
  isOtherFlyoutOpen,
  openMigrationRuleDetails,
}) => {
  const {
    services: { notifications },
  } = useKibana();
  const { euiTheme } = useEuiTheme();
  const { isTourActive, currentTourStep } = tourState;

  // A rule with a details link (not failed) whose flyout renders "Add to chat" (not installed).
  const eligibleRule = useMemo(
    () =>
      migrationRules.find(
        ({ status, translation_result: translationResult, elastic_rule: elasticRule }) =>
          status === SiemMigrationStatus.COMPLETED &&
          (translationResult === MigrationTranslationResult.FULL ||
            translationResult === MigrationTranslationResult.PARTIAL) &&
          !elasticRule?.id
      ),
    [migrationRules]
  );
  const openedRule = useMemo(
    () => migrationRules.find(({ id }) => id === openedMigrationRuleId),
    [migrationRules, openedMigrationRuleId]
  );
  const isRuleChatFlyoutOpen = openedRule != null && !openedRule.elastic_rule?.id;
  const isBulkButtonEnabled = useIsAnchorMounted(ADD_TO_CHAT_TOUR_ANCHORS.bulkButton);

  const canRunTour =
    isTourActive &&
    notifications.tours.isEnabled() &&
    isTableLoaded &&
    eligibleRule != null &&
    isBulkButtonEnabled;

  useEffect(() => {
    if (canRunTour && isRuleChatFlyoutOpen && currentTourStep < 3) {
      goToStep(3);
    }
  }, [canRunTour, isRuleChatFlyoutOpen, currentTourStep, goToStep]);

  const activeStep = useMemo<ActiveStep | undefined>(() => {
    if (!canRunTour || eligibleRule == null) {
      return undefined;
    }
    if (isRuleChatFlyoutOpen) {
      return currentTourStep === 3
        ? { step: 3, anchor: ADD_TO_CHAT_TOUR_ANCHORS.flyoutButton }
        : undefined;
    }
    if (openedMigrationRuleId != null || isOtherFlyoutOpen) {
      return undefined;
    }
    return currentTourStep === 1
      ? { step: 1, anchor: ADD_TO_CHAT_TOUR_ANCHORS.bulkButton }
      : { step: 2, anchor: ADD_TO_CHAT_TOUR_ANCHORS.ruleName(eligibleRule.id) };
  }, [
    canRunTour,
    eligibleRule,
    isRuleChatFlyoutOpen,
    currentTourStep,
    openedMigrationRuleId,
    isOtherFlyoutOpen,
  ]);

  const onNext = useCallback(() => {
    if (activeStep?.step === 2 && eligibleRule != null) {
      // Opening the flyout moves the tour to step 3 through the effect above.
      openMigrationRuleDetails(eligibleRule);
      return;
    }
    goToStep(2);
  }, [activeStep, eligibleRule, goToStep, openMigrationRuleDetails]);

  const isAnchorMounted = useIsAnchorMounted(activeStep?.anchor ?? 'body');
  const isStepShowing = activeStep != null && isAnchorMounted;

  useEffect(() => {
    setIsStepShowing(isStepShowing);
    return () => setIsStepShowing(false);
  }, [isStepShowing, setIsStepShowing]);

  if (!isStepShowing) {
    return null;
  }

  const { step, anchor } = activeStep;
  const { title, description, anchorPosition } = STEP_CONTENT[step];
  const stepTestId = `${ADD_TO_CHAT_TOUR_TEST_ID}-step${step}`;

  const tourStep = (
    <EuiTourStep
      // EuiWrappingPopover moves its target and restores it only on unmount; remount per target.
      key={anchor}
      anchor={anchor}
      anchorPosition={anchorPosition}
      title={title}
      content={
        <EuiText size="s">
          <p>{description}</p>
        </EuiText>
      }
      step={step}
      stepsTotal={ADD_TO_CHAT_TOUR_STEPS_TOTAL}
      isStepOpen
      minWidth={ADD_TO_CHAT_TOUR_POPOVER_WIDTH}
      maxWidth={ADD_TO_CHAT_TOUR_POPOVER_WIDTH}
      // Table steps sit below EUI flyout masks (levels.flyout - 2), so any flyout opened over them
      // covers them. The flyout step keeps the default, above its own flyout.
      zIndex={
        step === ADD_TO_CHAT_TOUR_STEPS_TOTAL ? undefined : Number(euiTheme.levels.flyout) - 3
      }
      onFinish={completeTour}
      panelProps={{ 'data-test-subj': stepTestId }}
      footerAction={
        step === ADD_TO_CHAT_TOUR_STEPS_TOTAL ? (
          <EuiButton
            color="success"
            size="s"
            onClick={completeTour}
            data-test-subj={`${stepTestId}-finish`}
          >
            {FINISH_BUTTON_LABEL}
          </EuiButton>
        ) : (
          [
            <EuiButtonEmpty
              key="skip"
              size="s"
              color="text"
              onClick={completeTour}
              data-test-subj={`${stepTestId}-skip`}
            >
              {SKIP_BUTTON_LABEL}
            </EuiButtonEmpty>,
            <EuiButton
              key="next"
              color="success"
              size="s"
              onClick={onNext}
              data-test-subj={`${stepTestId}-next`}
            >
              {step === 2 ? OPEN_RULE_BUTTON_LABEL : NEXT_BUTTON_LABEL}
            </EuiButton>,
          ]
        )
      }
    />
  );

  return step === ADD_TO_CHAT_TOUR_STEPS_TOTAL ? (
    <EuiDelayRender delay={ADD_TO_CHAT_TOUR_FLYOUT_STEP_DELAY_MS}>{tourStep}</EuiDelayRender>
  ) : (
    tourStep
  );
};
