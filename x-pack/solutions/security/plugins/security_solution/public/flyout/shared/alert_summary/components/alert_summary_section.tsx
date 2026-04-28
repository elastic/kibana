/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo, useState } from 'react';
import {
  EuiAccordion,
  EuiHorizontalRule,
  EuiIcon,
  EuiSkeletonText,
  EuiSpacer,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { type PromptContext } from '@kbn/elastic-assistant';
import { i18n } from '@kbn/i18n';
import { AlertSummary } from './alert_summary';
import { AlertSummaryOptionsMenu } from './alert_summary_options_menu';
import { useKibana } from '../../../../common/lib/kibana';
import { useDefaultAIConnectorId } from '../../../../common/hooks/use_default_ai_connector_id';
import { useAnonymizationToggle } from '../hooks/use_anonymization_toggle';

export const ALERT_SUMMARY_SECTION_TEST_ID = 'alert-flyout-ai-summary-section';

const AI_SUMMARY = i18n.translate('xpack.securitySolution.alertSummary.aiSummarySection.title', {
  defaultMessage: 'AI summary',
});

export interface AlertSummarySectionProps {
  /**
   * Id of the alert the section is summarising.
   */
  alertId: string;
  /**
   * The Elastic AI Assistant invokes this function to retrieve the context
   * data, which is included in the prompt (e.g. the alert's fields).
   */
  getPromptContext: () => Promise<string> | Promise<Record<string, string[]>>;
  /**
   * Optional override for the section's outermost data-test-subj. Defaults
   * to `ALERT_SUMMARY_SECTION_TEST_ID`.
   */
  ['data-test-subj']?: string;
}

/**
 * Shared "AI summary" section rendered in three flyouts (EASE, legacy
 * expandable flyout, v2 flyout). Owns the section's local state — the
 * anonymization toggle (via `useAnonymizationToggle`) and the
 * `hasAlertSummary` flag — so the three call sites only need to forward the
 * alert id and a prompt-context provider.
 *
 * Visually mirrors the "Entity summary" section
 * (`EntityHighlightsAccordion`): an `EuiAccordion` that defaults open, an
 * `<h3>` title with an inline sparkles icon, the options menu in
 * `extraAction`, and a trailing `EuiHorizontalRule` so each host flyout
 * gets the same chrome without per-flyout overrides.
 */
export const AlertSummarySection = memo(
  ({
    alertId,
    getPromptContext,
    'data-test-subj': dataTestSubj = ALERT_SUMMARY_SECTION_TEST_ID,
  }: AlertSummarySectionProps) => {
    const [hasAlertSummary, setHasAlertSummary] = useState(false);

    const {
      application: { capabilities },
    } = useKibana().services;

    const { defaultConnectorId, isLoading: isLoadingDefaultConnectorId } =
      useDefaultAIConnectorId();
    const { showAnonymizedValues, setShowAnonymizedValues } = useAnonymizationToggle();

    const canSeeAdvancedSettings = capabilities.management.kibana.settings ?? false;

    const promptContext: PromptContext = useMemo(
      () => ({
        category: 'alert',
        description: 'Alert summary',
        getPromptContext,
        id: `contextId-${alertId}`,
        tooltip: '', // empty as tooltip is only used within Assistant, but in the flyout
      }),
      [alertId, getPromptContext]
    );

    const accordionId = useGeneratedHtmlId({ prefix: 'aiSummaryAccordion' });

    const optionsMenu = (
      <AlertSummaryOptionsMenu
        hasAlertSummary={hasAlertSummary}
        showAnonymizedValues={showAnonymizedValues}
        setShowAnonymizedValues={setShowAnonymizedValues}
      />
    );

    const body = isLoadingDefaultConnectorId ? (
      <EuiSkeletonText lines={3} size="s" />
    ) : (
      <AlertSummary
        alertId={alertId}
        canSeeAdvancedSettings={canSeeAdvancedSettings}
        defaultConnectorId={defaultConnectorId}
        promptContext={promptContext}
        setHasAlertSummary={setHasAlertSummary}
        showAnonymizedValues={showAnonymizedValues}
      />
    );

    return (
      <>
        <EuiAccordion
          initialIsOpen
          id={accordionId}
          data-test-subj={dataTestSubj}
          buttonContent={
            <EuiTitle size="xs">
              <h3>
                {AI_SUMMARY} <EuiIcon type="sparkles" aria-hidden={true} />
              </h3>
            </EuiTitle>
          }
          extraAction={optionsMenu}
        >
          <EuiSpacer size="m" />
          {body}
        </EuiAccordion>
        <EuiHorizontalRule />
      </>
    );
  }
);

AlertSummarySection.displayName = 'AlertSummarySection';
