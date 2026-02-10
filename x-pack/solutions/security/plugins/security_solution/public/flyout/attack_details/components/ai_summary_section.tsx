/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';

import { EuiIcon, EuiPanel, EuiSpacer, EuiSwitch, EuiTitle } from '@elastic/eui';
import { css } from '@emotion/react';
import { AttackDiscoveryMarkdownFormatter } from '../../../attack_discovery/pages/results/attack_discovery_markdown_formatter';
import { useOverviewTabData } from '../hooks/use_overview_tab_data';
import { ExpandableSection } from '../../shared/components/expandable_section';
import { FLYOUT_STORAGE_KEYS } from '../constants/local_storage';
import { useExpandSection } from '../../shared/hooks/use_expand_section';

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

  // for showing / hiding anonymized data
  const [showAnonymized, setShowAnonymized] = useState<boolean>(false);

  const onToggleShowAnonymized = useCallback(() => setShowAnonymized((current) => !current), []);

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
          />
        </>
      }
      localStorageKey={FLYOUT_STORAGE_KEYS.ATTACK_DETAILS_OVERVIEW_TAB_EXPANDED_SECTIONS}
      sectionId={KEY}
      gutterSize="s"
      data-test-subj={KEY}
    >
      <EuiSwitch
        checked={showAnonymized}
        compressed
        data-test-subj="overview-tab-toggle-anonymized"
        label={
          <FormattedMessage
            id="xpack.securitySolution.attackDetailsFlyout.overview.AISummary.showAnonymizedLabel"
            defaultMessage="Show anonymized values"
          />
        }
        onChange={onToggleShowAnonymized}
      />

      <EuiSpacer size="s" />

      <EuiPanel hasBorder data-test-subj="overview-tab-ai-summary-panel">
        <div data-test-subj="overview-tab-ai-summary-content">
          <AttackDiscoveryMarkdownFormatter
            disableActions
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
            disableActions
            markdown={showAnonymized ? detailsMarkdown : detailsMarkdownWithReplacements}
          />
        </div>
      </EuiPanel>
      <EuiSpacer size="s" />
    </ExpandableSection>
  );
});

AISummarySection.displayName = 'AISummarySection';
