/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useEffect } from 'react';
import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSkeletonText,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import type { PromptContext } from '@kbn/elastic-assistant';
import { css } from '@emotion/react';
import { AssistantIcon } from '@kbn/ai-assistant-icon';
import { i18n } from '@kbn/i18n';
import { ConnectorMissingCallout } from './connector_missing_callout';
import { useAlertSummary } from '../hooks/use_alert_summary';
import { MessageText } from './message_text';

export const ALERT_SUMMARY_TEST_ID = 'ai-for-soc-alert-flyout-alert-summary';
export const GENERATE_INSIGHTS_BUTTON_TEST_ID = 'ai-for-soc-alert-flyout-generate-insights-button';
export const REGENERATE_INSIGHTS_BUTTON_TEST_ID =
  'ai-for-soc-alert-flyout-regenerate-insights-button';

const RECOMMENDED_ACTIONS = i18n.translate(
  'xpack.securitySolution.alertSummary.recommendedActions',
  {
    defaultMessage: 'Recommended actions',
  }
);
const GENERATING = i18n.translate('xpack.securitySolution.alertSummary.generating', {
  defaultMessage: 'Generating AI description and recommended actions.',
});
const GENERATE = i18n.translate('xpack.securitySolution.alertSummary.generate', {
  defaultMessage: 'Generate insights',
});
const REGENERATE = i18n.translate('xpack.securitySolution.alertSummary.regenerate', {
  defaultMessage: 'Regenerate insights',
});

export interface AlertSummaryProps {
  /**
   * Id of the alert for which we will generate the summary
   */
  alertId: string;
  /**
   * Value of useKibana.services.application.capabilities.management.kibana.settings
   */
  canSeeAdvancedSettings: boolean;
  /**
   * Value of securitySolution:defaultAIConnector
   */
  defaultConnectorId: string;
  /**
   * The context for the prompt
   */
  promptContext: PromptContext;
  /**
   * Callback to set the value to the parent to be able to control the menu options
   */
  setHasAlertSummary: React.Dispatch<React.SetStateAction<boolean>>;
  /**
   * If true we'll show anonymized values
   */
  showAnonymizedValues?: boolean;
}

/**
 * Component generating the AI summary for the visualized alert and showing in the alert summary section of the AI for SOC flyout.
 */
export const AlertSummary = memo(
  ({
    alertId,
    canSeeAdvancedSettings,
    defaultConnectorId,
    promptContext,
    setHasAlertSummary,
    showAnonymizedValues,
  }: AlertSummaryProps) => {
    const {
      alertSummary,
      recommendedActions,
      hasAlertSummary,
      fetchAISummary,
      isConnectorMissing,
      isLoading,
      messageAndReplacements,
    } = useAlertSummary({
      alertId,
      defaultConnectorId,
      promptContext,
      showAnonymizedValues,
    });

    useEffect(() => {
      setHasAlertSummary(hasAlertSummary);
    }, [hasAlertSummary, setHasAlertSummary]);

    return (
      <>
        {hasAlertSummary ? (
          isLoading ? (
            <>
              <EuiText
                color="subdued"
                css={css`
                  font-style: italic;
                `}
                size="s"
                data-test-subj={ALERT_SUMMARY_TEST_ID}
              >
                {GENERATING}
              </EuiText>
              <EuiSkeletonText lines={3} size="s" />
            </>
          ) : (
            <>
              {isConnectorMissing && (
                <>
                  <ConnectorMissingCallout canSeeAdvancedSettings={canSeeAdvancedSettings} />
                  <EuiSpacer size="m" />
                </>
              )}
              <MessageText content={alertSummary} />

              <EuiSpacer size="m" />
              {recommendedActions && (
                <>
                  <EuiPanel hasShadow={false} hasBorder paddingSize="s">
                    <EuiText size="xs" color="subdued">
                      {RECOMMENDED_ACTIONS}
                    </EuiText>
                    <EuiSpacer size="s" />
                    <MessageText content={recommendedActions} />
                  </EuiPanel>
                  <EuiSpacer size="m" />
                </>
              )}
              <EuiFlexGroup gutterSize="s">
                <EuiFlexItem grow={false}>
                  <EuiButton
                    onClick={fetchAISummary}
                    color="primary"
                    size="m"
                    data-test-subj={REGENERATE_INSIGHTS_BUTTON_TEST_ID}
                    isLoading={messageAndReplacements == null}
                  >
                    <EuiFlexGroup
                      gutterSize="s"
                      alignItems="center"
                      responsive={false}
                      wrap={false}
                    >
                      <EuiFlexItem grow={false}>
                        <AssistantIcon size="m" />
                      </EuiFlexItem>
                      <EuiFlexItem grow={false}>{REGENERATE}</EuiFlexItem>
                    </EuiFlexGroup>
                  </EuiButton>
                </EuiFlexItem>
              </EuiFlexGroup>
            </>
          )
        ) : (
          <EuiFlexGroup gutterSize="s">
            <EuiFlexItem grow={false}>
              <EuiButton
                onClick={fetchAISummary}
                color="primary"
                size="m"
                data-test-subj={GENERATE_INSIGHTS_BUTTON_TEST_ID}
                isLoading={messageAndReplacements == null}
              >
                <EuiFlexGroup gutterSize="s" alignItems="center">
                  <EuiFlexItem grow={false}>
                    <AssistantIcon size="m" />
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>{GENERATE}</EuiFlexItem>
                </EuiFlexGroup>
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        )}
      </>
    );
  }
);

AlertSummary.displayName = 'AlertSummary';
