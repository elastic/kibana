/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { EuiSpacer } from '@elastic/eui';
import { KbnInfoCallout } from '@kbn/ui-callout';

import {
  ENABLE_ATTACK_DISCOVERY_WORKFLOWS_SETTING,
  NEW_FEATURES_TOUR_STORAGE_KEYS,
} from '../../../../../common/constants';
import { useKibana } from '../../../../common/lib/kibana';
import { useAppToasts } from '../../../../common/hooks/use_app_toasts';
import { AttacksEventTypes } from '../../../../common/lib/telemetry';
import * as i18n from './translations';

export const WORKFLOWS_PROMOTION_CALLOUT_TEST_ID = 'attacks-page-workflows-promotion-callout';
export const WORKFLOWS_PROMOTION_CALLOUT_ENABLE_TEST_ID =
  'attacks-page-workflows-promotion-callout-enable';
export const WORKFLOWS_PROMOTION_CALLOUT_DISMISS_TEST_ID =
  'attacks-page-workflows-promotion-callout-dismiss';
export const WORKFLOWS_PROMOTION_CALLOUT_MISSING_PRIVILEGES_TEST_ID =
  'attacks-page-workflows-promotion-callout-missing-privileges';
export const WORKFLOWS_PROMOTION_CALLOUT_LEARN_MORE_TEST_ID =
  'attacks-page-workflows-promotion-callout-learn-more';

const STORAGE_KEY = NEW_FEATURES_TOUR_STORAGE_KEYS.ATTACKS_PAGE_WORKFLOWS_PROMOTION_CALLOUT;

/**
 * Promotes the per-space "Attack Discovery Workflows" opt-in on the Attacks page.
 *
 * Rendered between the page header and the filters, it lets an eligible user turn
 * on the `securitySolution:enableAttackDiscoveryWorkflows` Advanced Setting in one
 * click — without leaving the page — and can be dismissed (persisted per browser).
 * It is only shown when the workflows feature is available at the deployment level
 * (`attackDiscoveryWorkflowsEnabled` feature flag) but not yet enabled for the space.
 */
const WorkflowsPromotionCalloutComponent: React.FC = () => {
  const {
    services: { application, docLinks, featureFlags, storage, telemetry, uiSettings },
  } = useKibana();
  const { addError } = useAppToasts();

  // Read the feature flag and per-space opt-in synchronously during render so the
  // callout never flashes in and out. The FF is only `false` when an administrator
  // disables the feature globally.
  const isWorkflowsFeatureAvailable = featureFlags.getBooleanValue(
    'securitySolution.attackDiscoveryWorkflowsEnabled',
    true
  );
  const isWorkflowsEnabledForSpace = uiSettings.get<boolean>(
    ENABLE_ATTACK_DISCOVERY_WORKFLOWS_SETTING,
    false
  );
  const canSaveAdvancedSettings = application.capabilities.advancedSettings?.save === true;

  const [isDismissed, setIsDismissed] = useState<boolean>(() => storage.get(STORAGE_KEY) === true);
  const [isEnabling, setIsEnabling] = useState<boolean>(false);

  const isVisible = useMemo(
    () => isWorkflowsFeatureAvailable && !isWorkflowsEnabledForSpace && !isDismissed,
    [isDismissed, isWorkflowsEnabledForSpace, isWorkflowsFeatureAvailable]
  );

  const hasReportedView = useRef(false);
  useEffect(() => {
    if (isVisible && !hasReportedView.current) {
      hasReportedView.current = true;
      telemetry.reportEvent(AttacksEventTypes.WorkflowsPromotionCalloutAction, { action: 'view' });
    }
  }, [isVisible, telemetry]);

  const onDismiss = useCallback(() => {
    setIsDismissed(true);
    storage.set(STORAGE_KEY, true);
    telemetry.reportEvent(AttacksEventTypes.WorkflowsPromotionCalloutAction, { action: 'dismiss' });
  }, [storage, telemetry]);

  const onLearnMore = useCallback(() => {
    telemetry.reportEvent(AttacksEventTypes.WorkflowsPromotionCalloutAction, {
      action: 'learn_more',
    });
  }, [telemetry]);

  const onEnable = useCallback(async () => {
    telemetry.reportEvent(AttacksEventTypes.WorkflowsPromotionCalloutAction, { action: 'enable' });
    setIsEnabling(true);
    try {
      await uiSettings.set(ENABLE_ATTACK_DISCOVERY_WORKFLOWS_SETTING, true);
      // The setting is registered with `requiresPageReload: true`: reload so every
      // workflows-gated surface on the page picks up the newly enabled value.
      window.location.reload();
    } catch (error) {
      setIsEnabling(false);
      addError(error, { title: i18n.CALLOUT_ENABLE_ERROR_TITLE });
    }
  }, [addError, telemetry, uiSettings]);

  if (!isVisible) {
    return null;
  }

  return (
    <>
      <KbnInfoCallout
        size="m"
        title={i18n.CALLOUT_TITLE}
        data-test-subj={WORKFLOWS_PROMOTION_CALLOUT_TEST_ID}
        onDismiss={onDismiss}
        dismissButtonProps={{
          'aria-label': i18n.CALLOUT_DISMISS_ARIA_LABEL,
          'data-test-subj': WORKFLOWS_PROMOTION_CALLOUT_DISMISS_TEST_ID,
        }}
        text={
          canSaveAdvancedSettings ? (
            <p>{i18n.CALLOUT_DESCRIPTION}</p>
          ) : (
            <p data-test-subj={WORKFLOWS_PROMOTION_CALLOUT_MISSING_PRIVILEGES_TEST_ID}>
              {i18n.CALLOUT_MISSING_PRIVILEGES_DESCRIPTION}
            </p>
          )
        }
        // When rendered wide enough, EUI places the action to the right of the
        // text and vertically centers it; it stacks below on narrow widths.
        actionProps={
          canSaveAdvancedSettings
            ? {
                primary: {
                  children: i18n.CALLOUT_ENABLE_BUTTON,
                  onClick: onEnable,
                  isLoading: isEnabling,
                  'data-test-subj': WORKFLOWS_PROMOTION_CALLOUT_ENABLE_TEST_ID,
                },
              }
            : {
                primary: {
                  children: i18n.CALLOUT_LEARN_MORE,
                  href: docLinks.links.siem.runAttackDiscoveryInWorkflow,
                  target: '_blank',
                  rel: 'noopener',
                  onClick: onLearnMore,
                  'data-test-subj': WORKFLOWS_PROMOTION_CALLOUT_LEARN_MORE_TEST_ID,
                },
              }
        }
      />
      <EuiSpacer size="l" />
    </>
  );
};

export const WorkflowsPromotionCallout = React.memo(WorkflowsPromotionCalloutComponent);
WorkflowsPromotionCallout.displayName = 'WorkflowsPromotionCallout';
