/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo, useState } from 'react';
import { EuiIcon, EuiSkeletonText } from '@elastic/eui';
import { type PromptContext } from '@kbn/elastic-assistant';
import { i18n } from '@kbn/i18n';
import { DocumentSummary } from './document_summary';
import { DocumentSummaryOptionsMenu } from './document_summary_options_menu';
import { useKibana } from '../../../../common/lib/kibana';
import { useDefaultAIConnectorId } from '../../../../common/hooks/use_default_ai_connector_id';
import { ExpandableSection } from '../../../shared/components/expandable_section';
import { useExpandSection } from '../../../shared/hooks/use_expand_section';
import { FLYOUT_STORAGE_KEYS } from '../constants/local_storage';
import { useAnonymizationToggle } from '../hooks/use_anonymization_toggle';

export const DOCUMENT_SUMMARY_SECTION_TEST_ID = 'document-flyout-ai-summary-section';

const AI_SUMMARY = i18n.translate('xpack.securitySolution.alertSummary.aiSummarySection.title', {
  defaultMessage: 'AI summary',
});
const LOCAL_STORAGE_SECTION_KEY = 'aisummary';

export interface DocumentSummarySectionProps {
  /**
   * Id of the document the section is summarising.
   */
  documentId: string;
  /**
   * The Elastic AI Assistant invokes this function to retrieve the context
   * data, which is included in the prompt (e.g. the alert's fields).
   */
  getPromptContext: () => Promise<string> | Promise<Record<string, string[]>>;
  /**
   * Optional override for the section's outermost data-test-subj. Defaults
   * to `DOCUMENT_SUMMARY_SECTION_TEST_ID`.
   */
  ['data-test-subj']?: string;
}

/**
 * Shared "AI summary" section rendered in the EASE flyout and the v2
 * document flyout. Owns the section's local state — the anonymization
 * toggle (via `useAnonymizationToggle`) and the `hasSummary` flag — so
 * the call sites only need to forward the alert id and a prompt-context
 * provider.
 *
 * Visually mirrors the "Entity summary" section
 * (`EntityHighlightsAccordion`): an `EuiAccordion` that defaults open, an
 * `<h3>` title with an inline sparkles icon, the options menu in
 * `extraAction`, and a trailing `EuiHorizontalRule` so each host flyout
 * gets the same chrome without per-flyout overrides.
 */
export const DocumentSummarySection = memo(
  ({
    documentId,
    getPromptContext,
    'data-test-subj': dataTestSubj = DOCUMENT_SUMMARY_SECTION_TEST_ID,
  }: DocumentSummarySectionProps) => {
    const [hasSummary, setHasSummary] = useState(false);

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
        id: `contextId-${documentId}`,
        tooltip: '', // empty as tooltip is only used within Assistant, but in the flyout
      }),
      [documentId, getPromptContext]
    );

    const expanded = useExpandSection({
      storageKey: FLYOUT_STORAGE_KEYS.OVERVIEW_TAB_EXPANDED_SECTIONS,
      title: LOCAL_STORAGE_SECTION_KEY,
      defaultValue: true,
    });

    const optionsMenu = (
      <DocumentSummaryOptionsMenu
        hasSummary={hasSummary}
        showAnonymizedValues={showAnonymizedValues}
        setShowAnonymizedValues={setShowAnonymizedValues}
      />
    );

    const body = isLoadingDefaultConnectorId ? (
      <EuiSkeletonText lines={3} size="s" />
    ) : (
      <DocumentSummary
        documentId={documentId}
        canSeeAdvancedSettings={canSeeAdvancedSettings}
        defaultConnectorId={defaultConnectorId}
        promptContext={promptContext}
        setHasSummary={setHasSummary}
        showAnonymizedValues={showAnonymizedValues}
      />
    );

    return (
      <ExpandableSection
        data-test-subj={dataTestSubj}
        expanded={expanded}
        gutterSize="none"
        localStorageKey={FLYOUT_STORAGE_KEYS.OVERVIEW_TAB_EXPANDED_SECTIONS}
        sectionId={LOCAL_STORAGE_SECTION_KEY}
        title={
          <>
            {AI_SUMMARY} <EuiIcon type="sparkles" aria-hidden={true} />
          </>
        }
        extraAction={optionsMenu}
      >
        {body}
      </ExpandableSection>
    );
  }
);

DocumentSummarySection.displayName = 'DocumentSummarySection';
