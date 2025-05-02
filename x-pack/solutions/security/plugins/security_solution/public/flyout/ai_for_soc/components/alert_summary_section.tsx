/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo, useState } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiTitle } from '@elastic/eui';
import type { PromptContext } from '@kbn/elastic-assistant';
import { i18n } from '@kbn/i18n';
import { AlertSummary } from './alert_summary';
import { AlertSummaryOptionsMenu } from './settings_menu';
import { useKibana } from '../../../common/lib/kibana';
import { useAIForSOCDetailsContext } from '../context';
import { DEFAULT_AI_CONNECTOR } from '../../../../common/constants';

export const ALERT_SUMMARY_SECTION_TEST_ID = 'ai-for-soc-alert-flyout-alert-summary-section';

const AI_SUMMARY = i18n.translate('xpack.securitySolution.alertSummary.aiSummarySection.title', {
  defaultMessage: 'AI summary',
});

export interface AlertSummarySectionProps {
  /**
   * The Elastic AI Assistant will invoke this function to retrieve the context data,
   * which will be included in a prompt (e.g. the contents of an alert or an event)
   */
  getPromptContext: () => Promise<string> | Promise<Record<string, string[]>>;
}

/**
 * Alert summary section of the AI for SOC alert summary alert flyout.
 */
export const AlertSummarySection = memo(({ getPromptContext }: AlertSummarySectionProps) => {
  const [hasAlertSummary, setHasAlertSummary] = useState(false);

  const {
    application: { capabilities },
    uiSettings,
  } = useKibana().services;

  const { eventId, showAnonymizedValues } = useAIForSOCDetailsContext();

  const canSeeAdvancedSettings = capabilities.management.kibana.settings ?? false;
  const defaultConnectorId = uiSettings.get<string>(DEFAULT_AI_CONNECTOR);

  const promptContext: PromptContext = useMemo(
    () => ({
      category: 'alert',
      description: 'Alert summary',
      getPromptContext,
      id: `contextId-${eventId}`,
      tooltip: '', // empty as tooltip is only used within Assistant, but in the flyout
    }),
    [eventId, getPromptContext]
  );

  return (
    <>
      <EuiFlexGroup data-test-subj={ALERT_SUMMARY_SECTION_TEST_ID} justifyContent={'spaceBetween'}>
        <EuiFlexItem grow={false}>
          <EuiTitle size={'s'}>
            <h2>{AI_SUMMARY}</h2>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <AlertSummaryOptionsMenu hasAlertSummary={hasAlertSummary} />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <AlertSummary
        alertId={eventId}
        canSeeAdvancedSettings={canSeeAdvancedSettings}
        defaultConnectorId={defaultConnectorId}
        promptContext={promptContext}
        setHasAlertSummary={setHasAlertSummary}
        showAnonymizedValues={showAnonymizedValues}
      />
    </>
  );
});

AlertSummarySection.displayName = 'AlertSummarySection';
