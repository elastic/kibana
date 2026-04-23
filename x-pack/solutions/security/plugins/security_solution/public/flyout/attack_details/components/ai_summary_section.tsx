/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiSwitchEvent } from '@elastic/eui';
import { EuiIcon, EuiPanel, EuiSpacer, EuiTitle } from '@elastic/eui';
import React, { memo, useCallback, useMemo, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { css } from '@emotion/react';
import { TableId } from '@kbn/securitysolution-data-table';
import { AttackDiscoveryMarkdownFormatter } from '../../../attack_discovery/pages/results/attack_discovery_markdown_formatter';
import { useOverviewTabData } from '../hooks/use_overview_tab_data';
import { ExpandableSection } from '../../../flyout_v2/shared/components/expandable_section';
import { FLYOUT_STORAGE_KEYS } from '../constants/local_storage';
import { useExpandSection } from '../../../flyout_v2/shared/hooks/use_expand_section';
import { AISummarySectionSettings } from './ai_summary_section_settings';

const KEY = 'aisummary';

/**
 * Renders the AI Summary section in the Overview tab of the Attack Details flyout.
 *
 * Displays an AI-generated summary and background information, with a toggle
 * to switch between anonymized and resolved values. The section is expandable
 * and persists its expanded state.
 */
export const AISummarySection = memo(() => {
  const expanded = useExpandSection({
    storageKey: FLYOUT_STORAGE_KEYS.ATTACK_DETAILS_OVERVIEW_TAB_EXPANDED_SECTIONS,
    title: KEY,
    defaultValue: true,
  });
  const {
    summaryMarkdown,
    summaryMarkdownWithReplacements,
    detailsMarkdown,
    detailsMarkdownWithReplacements,
  } = useOverviewTabData();

  const hasAnonymizedContent = useMemo(
    () => summaryMarkdown.trim() !== '' || detailsMarkdown.trim() !== '',
    [detailsMarkdown, summaryMarkdown]
  );

  const [showAnonymized, setShowAnonymized] = useState<boolean>(false);
  const onChangeShowAnonymized = useCallback((event: EuiSwitchEvent) => {
    setShowAnonymized(event.target.checked);
  }, []);

  const [isPopoverOpen, setPopover] = useState(false);
  const openPopover = useCallback(() => {
    setPopover((open) => !open);
  }, []);
  const closePopover = useCallback(() => {
    setPopover(false);
  }, []);

  return (
    <ExpandableSection
      expanded={expanded}
      title={
        <>
          <FormattedMessage
            id="xpack.securitySolution.attackDetailsFlyout.overview.AISummary.sectionTitle"
            defaultMessage="Attack Summary"
          />
          <EuiIcon
            css={css`
              margin-left: 4px;
            `}
            type="sparkles"
            color="primary"
            aria-hidden={true}
          />
        </>
      }
      localStorageKey={FLYOUT_STORAGE_KEYS.ATTACK_DETAILS_OVERVIEW_TAB_EXPANDED_SECTIONS}
      sectionId={KEY}
      gutterSize="s"
      data-test-subj={KEY}
      extraAction={
        <AISummarySectionSettings
          showAnonymized={showAnonymized}
          onChangeShowAnonymized={onChangeShowAnonymized}
          closePopover={closePopover}
          openPopover={openPopover}
          isPopoverOpen={isPopoverOpen}
          hasAnonymizedContent={hasAnonymizedContent}
        />
      }
    >
      <EuiPanel hasBorder data-test-subj="overview-tab-ai-summary-panel">
        <div data-test-subj="overview-tab-ai-summary-content">
          <AttackDiscoveryMarkdownFormatter
            scopeId={TableId.alertsOnAttacksPage}
            disableActions={showAnonymized}
            markdown={showAnonymized ? summaryMarkdown : summaryMarkdownWithReplacements}
          />
        </div>

        <EuiSpacer size="s" />

        <EuiTitle data-test-subj="overview-tab-background-title" size="xs">
          <h2>
            <FormattedMessage
              id="xpack.securitySolution.attackDetailsFlyout.overview.AISummary.backgroundTitle"
              defaultMessage="Background"
            />
          </h2>
        </EuiTitle>

        <EuiSpacer size="s" />

        <div data-test-subj="overview-tab-ai-background-content">
          <AttackDiscoveryMarkdownFormatter
            disableActions={showAnonymized}
            scopeId={TableId.alertsOnAttacksPage}
            markdown={showAnonymized ? detailsMarkdown : detailsMarkdownWithReplacements}
          />
        </div>
      </EuiPanel>
      <EuiSpacer size="s" />
    </ExpandableSection>
  );
});

AISummarySection.displayName = 'AISummarySection';
