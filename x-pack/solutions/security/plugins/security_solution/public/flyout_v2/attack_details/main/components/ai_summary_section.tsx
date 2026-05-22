/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiSwitchEvent } from '@elastic/eui';
import {
  EuiButtonIcon,
  EuiContextMenu,
  EuiContextMenuItem,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiPopover,
  EuiPopoverTitle,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import React, { memo, useCallback, useMemo, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { TableId } from '@kbn/securitysolution-data-table';
import type { DataTableRecord } from '@kbn/discover-utils';
import { getFieldValue } from '@kbn/discover-utils';
import { AttackDiscoveryMarkdownFormatter } from '../../../../attack_discovery/pages/results/attack_discovery_markdown_formatter';
import { ExpandableSection } from '../../../shared/components/expandable_section';
import { FLYOUT_STORAGE_KEYS } from '../constants/local_storage';
import { useExpandSection } from '../../../shared/hooks/use_expand_section';

const KEY = 'aisummary';

const FIELD_SUMMARY_MARKDOWN = 'kibana.alert.attack_discovery.summary_markdown' as const;
const FIELD_SUMMARY_MARKDOWN_WITH_REPLACEMENTS =
  'kibana.alert.attack_discovery.summary_markdown_with_replacements' as const;
const FIELD_DETAILS_MARKDOWN = 'kibana.alert.attack_discovery.details_markdown' as const;
const FIELD_DETAILS_MARKDOWN_WITH_REPLACEMENTS =
  'kibana.alert.attack_discovery.details_markdown_with_replacements' as const;

const titleIconCss = css`
  margin-left: 4px;
`;

const contextMenuCss = css`
  width: 280px;
`;

interface AISummarySectionSettingsProps {
  showAnonymized: boolean;
  onChangeShowAnonymized: (event: EuiSwitchEvent) => void;
  closePopover: () => void;
  openPopover: () => void;
  isPopoverOpen: boolean;
  hasAnonymizedContent: boolean;
}

const AISummarySectionSettings: React.FC<AISummarySectionSettingsProps> = ({
  showAnonymized,
  onChangeShowAnonymized,
  closePopover,
  openPopover,
  isPopoverOpen,
  hasAnonymizedContent,
}) => {
  const panels = useMemo(
    () => [
      {
        id: 0,
        items: [
          {
            key: 'ai-summary-settings-options-title',
            renderItem: () => (
              <EuiPopoverTitle
                paddingSize="s"
                aria-label={i18n.translate(
                  'xpack.securitySolution.attackDetailsFlyout.overview.AISummary.optionsMenuTitle.ariaLabel',
                  {
                    defaultMessage: 'Options',
                  }
                )}
              >
                <EuiText size="xs">
                  <strong>
                    <FormattedMessage
                      id="xpack.securitySolution.attackDetailsFlyout.overview.AISummary.optionsMenuTitle"
                      defaultMessage="Options"
                    />
                  </strong>
                </EuiText>
              </EuiPopoverTitle>
            ),
          },
          {
            key: 'ai-summary-show-anonymized',
            renderItem: () => (
              <EuiContextMenuItem
                aria-label={i18n.translate(
                  'xpack.securitySolution.attackDetailsFlyout.overview.AISummary.showAnonymizedAriaLabel',
                  {
                    defaultMessage: 'Show anonymized values',
                  }
                )}
              >
                <EuiFlexGroup direction="row" gutterSize="s" alignItems="center">
                  <EuiFlexItem grow={false}>
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
                      onChange={onChangeShowAnonymized}
                      disabled={!hasAnonymizedContent}
                    />
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiContextMenuItem>
            ),
          },
        ],
      },
    ],
    [hasAnonymizedContent, onChangeShowAnonymized, showAnonymized]
  );

  return (
    <EuiPopover
      button={
        <EuiButtonIcon
          aria-label={i18n.translate(
            'xpack.securitySolution.attackDetailsFlyout.overview.AISummary.openMenuAriaLabel',
            {
              defaultMessage: 'Attack summary settings menu',
            }
          )}
          data-test-subj="overview-tab-ai-summary-settings-menu"
          iconType="boxesVertical"
          onClick={openPopover}
        />
      }
      isOpen={isPopoverOpen}
      closePopover={closePopover}
      panelPaddingSize="none"
      anchorPosition="leftUp"
    >
      <EuiContextMenu css={contextMenuCss} initialPanelId={0} panels={panels} />
    </EuiPopover>
  );
};

export interface AISummarySectionProps {
  /**
   * The attack-discovery document hit. The four markdown fields are read
   * directly off `hit.flattened` via `getFieldValue`.
   */
  hit: DataTableRecord;
}

/**
 * Renders the AI Summary section in the Overview tab of the Attack Details flyout.
 *
 * Displays an AI-generated summary and background information, with a toggle
 * to switch between anonymized and resolved values. The section is expandable
 * and persists its expanded state.
 */
export const AISummarySection = memo(({ hit }: AISummarySectionProps) => {
  const expanded = useExpandSection({
    storageKey: FLYOUT_STORAGE_KEYS.ATTACK_DETAILS_OVERVIEW_TAB_EXPANDED_SECTIONS,
    title: KEY,
    defaultValue: true,
  });

  const summaryMarkdown = (getFieldValue(hit, FIELD_SUMMARY_MARKDOWN) as string | undefined) ?? '';
  const summaryMarkdownWithReplacements =
    (getFieldValue(hit, FIELD_SUMMARY_MARKDOWN_WITH_REPLACEMENTS) as string | undefined) ?? '';
  const detailsMarkdown = (getFieldValue(hit, FIELD_DETAILS_MARKDOWN) as string | undefined) ?? '';
  const detailsMarkdownWithReplacements =
    (getFieldValue(hit, FIELD_DETAILS_MARKDOWN_WITH_REPLACEMENTS) as string | undefined) ?? '';

  const hasAnonymizedContent = summaryMarkdown.trim() !== '' || detailsMarkdown.trim() !== '';

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
          <EuiIcon css={titleIconCss} type="sparkles" color="primary" aria-hidden={true} />
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
