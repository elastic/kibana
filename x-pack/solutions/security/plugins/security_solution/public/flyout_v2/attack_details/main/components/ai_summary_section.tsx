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
  EuiToolTip,
} from '@elastic/eui';
import React, { memo, useCallback, useMemo, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { TableId } from '@kbn/securitysolution-data-table';
import type { AttackDiscoveryAlert } from '@kbn/elastic-assistant-common';
import { replaceAnonymizedValuesWithOriginalValues } from '@kbn/elastic-assistant-common';
import { AttackDiscoveryMarkdownFormatter } from '../../../../attack_discovery/pages/results/attack_discovery_markdown_formatter';
import { ExpandableSection } from '../../../shared/components/expandable_section';
import { FLYOUT_STORAGE_KEYS } from '../constants/local_storage';
import { useExpandSection } from '../../../shared/hooks/use_expand_section';

const KEY = 'aisummary';

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
        <EuiToolTip
          content={i18n.translate(
            'xpack.securitySolution.attackDetailsFlyout.overview.AISummary.openMenuAriaLabel',
            {
              defaultMessage: 'Attack summary settings menu',
            }
          )}
          disableScreenReaderOutput
        >
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
        </EuiToolTip>
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
   * The parsed attack-discovery alert resolved by {@link useAttackDetails}.
   * Sourced from the alert (not from `hit.flattened` / `hit.raw._source`)
   * because the hit is built without a `DataView` on the legacy thin-wrapper
   * timeline path, which drops the dotted markdown keys from `flattened`.
   *
   * `useAttackDetails` resolves the alert with `withReplacements: false`, so
   * `attack.summaryMarkdown` / `attack.detailsMarkdown` carry the anonymized
   * (UUID) values; the resolved variants are derived client-side from
   * `attack.replacements` via {@link replaceAnonymizedValuesWithOriginalValues}.
   */
  attack: AttackDiscoveryAlert;
}

/**
 * Renders the AI Summary section in the Overview tab of the Attack Details flyout.
 *
 * Displays an AI-generated summary and background information, with a toggle
 * to switch between anonymized and resolved values. The section is expandable
 * and persists its expanded state.
 */
export const AISummarySection = memo(({ attack }: AISummarySectionProps) => {
  const expanded = useExpandSection({
    storageKey: FLYOUT_STORAGE_KEYS.ATTACK_DETAILS_OVERVIEW_TAB_EXPANDED_SECTIONS,
    title: KEY,
    defaultValue: true,
  });

  const summaryMarkdown = attack.summaryMarkdown ?? '';
  const detailsMarkdown = attack.detailsMarkdown ?? '';

  const summaryMarkdownWithReplacements = useMemo(
    () =>
      replaceAnonymizedValuesWithOriginalValues({
        messageContent: summaryMarkdown,
        replacements: attack.replacements,
      }),
    [attack.replacements, summaryMarkdown]
  );

  const detailsMarkdownWithReplacements = useMemo(
    () =>
      replaceAnonymizedValuesWithOriginalValues({
        messageContent: detailsMarkdown,
        replacements: attack.replacements,
      }),
    [attack.replacements, detailsMarkdown]
  );

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
