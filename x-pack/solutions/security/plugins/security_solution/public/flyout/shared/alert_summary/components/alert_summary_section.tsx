/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, type ReactNode, useMemo, useState } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSkeletonText, EuiSpacer, EuiTitle } from '@elastic/eui';
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

export interface AlertSummarySectionRenderParts {
  /**
   * Section title element. Wrappers (e.g. legacy/v2) typically forward this
   * to their `ExpandableSection`'s `title` prop.
   */
  title: ReactNode;
  /**
   * Options menu element. Wrappers typically forward this to the
   * `extraAction` slot of their host `ExpandableSection`.
   */
  optionsMenu: ReactNode;
  /**
   * Body element (loading skeleton or generated summary + actions).
   */
  body: ReactNode;
}

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
   * Optional layout override. When provided, the section calls this with the
   * three rendered parts (title, options menu, body) and the caller composes
   * them into its own layout (e.g. a legacy/v2 `ExpandableSection`). When
   * omitted, the section renders the EASE-style default layout: a title row
   * with the options menu inline, followed by the body.
   */
  renderLayout?: (parts: AlertSummarySectionRenderParts) => ReactNode;
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
 * Layout is configurable via the optional `renderLayout` prop so each host
 * flyout can compose the section into its own container (e.g. an
 * `ExpandableSection`) while sharing all of the heavy lifting.
 */
export const AlertSummarySection = memo(
  ({
    alertId,
    getPromptContext,
    renderLayout,
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

    const title: ReactNode = AI_SUMMARY;

    const optionsMenu: ReactNode = (
      <AlertSummaryOptionsMenu
        hasAlertSummary={hasAlertSummary}
        showAnonymizedValues={showAnonymizedValues}
        setShowAnonymizedValues={setShowAnonymizedValues}
      />
    );

    const body: ReactNode = isLoadingDefaultConnectorId ? (
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

    if (renderLayout) {
      return <>{renderLayout({ title, optionsMenu, body })}</>;
    }

    return (
      <div data-test-subj={dataTestSubj}>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiTitle size="s">
              <h2>{title}</h2>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>{optionsMenu}</EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="s" />
        {body}
      </div>
    );
  }
);

AlertSummarySection.displayName = 'AlertSummarySection';
