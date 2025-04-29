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
import { ConnectorMissingCallout } from './connector_missing_callout';
import { useAlertSummary } from '../../hooks/use_alert_summary';
import { MessageText } from '../message_text';
import * as i18n from '../../constants/translations';

interface Props {
  alertId: string;
  canSeeAdvancedSettings: boolean;
  defaultConnectorId: string;
  isContextReady: boolean;
  promptContext: PromptContext;
  setHasAlertSummary: React.Dispatch<React.SetStateAction<boolean>>;
  showAnonymizedValues?: boolean;
}

export const AlertSummary = memo(
  ({
    alertId,
    canSeeAdvancedSettings,
    defaultConnectorId,
    isContextReady,
    promptContext,
    setHasAlertSummary,
    showAnonymizedValues,
  }: Props) => {
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
      isContextReady,
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
                data-test-subj="generating-summary"
              >
                {i18n.GENERATING}
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
                      {i18n.RECOMMENDED_ACTIONS}
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
                    data-test-subj="regenerateInsights"
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
                      <EuiFlexItem grow={false}>{i18n.REGENERATE}</EuiFlexItem>
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
                data-test-subj="generateInsights"
                isLoading={messageAndReplacements == null}
              >
                <EuiFlexGroup gutterSize="s" alignItems="center">
                  <EuiFlexItem grow={false}>
                    <AssistantIcon size="m" />
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>{i18n.GENERATE}</EuiFlexItem>
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
