/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIcon,
  EuiPanel,
  EuiPopover,
  EuiSkeletonText,
  EuiSkeletonTitle,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  EuiTitle,
  EuiToolTip,
  EuiBetaBadge,
  useEuiTheme,
  useResizeObserver,
} from '@elastic/eui';
import { ConnectorSelectorInline } from '@kbn/elastic-assistant';
import { noop } from 'lodash/fp';
import { AiButton, AiIcon } from '@kbn/shared-ux-ai-components';
import { useKibana } from '../../../../common/lib/kibana';
import type { HuntingLead } from './types';
import { GeneratedOnLabel } from './generated_on_label';
import { LeadCard } from './lead_card';
import { LeadsBanner } from './leads_banner';
import * as i18n from './translations';

const MAX_VISIBLE_CARDS = 5;
const MIN_CARD_WIDTH = 280;
const MAX_CARD_WIDTH = 480;
const CARD_GAP = 16; // EUI gutterSize="m"

interface TopThreatHuntingLeadsProps {
  leads: HuntingLead[];
  totalCount: number;
  isLoading: boolean;
  isGenerating: boolean;
  hasGenerated?: boolean;
  lastRunTimestamp?: string | null;
  isScheduled: boolean;
  onToggleSchedule: (enabled: boolean) => void;
  onSeeAll: () => void;
  onLeadClick: (lead: HuntingLead) => void;
  onHuntInChat: () => void;
  onGenerate: () => void;
  connectorId: string | undefined;
  hasValidConnector: boolean;
  onConnectorIdSelected: (id: string) => void;
  isAgentChatExperienceEnabled: boolean;
  hasWritePermissionError?: boolean;
}

export const TopThreatHuntingLeads: React.FC<TopThreatHuntingLeadsProps> = ({
  leads,
  totalCount,
  isLoading,
  isGenerating,
  hasGenerated,
  lastRunTimestamp,
  isScheduled,
  onToggleSchedule,
  onSeeAll,
  onLeadClick,
  onHuntInChat,
  onGenerate,
  connectorId,
  hasValidConnector,
  onConnectorIdSelected,
  isAgentChatExperienceEnabled,
  hasWritePermissionError,
}) => {
  const [storedIsOpen, setStoredIsOpen] = useLocalStorage<boolean>(
    'securitySolution.entityAnalytics.topThreatHuntingLeads.expanded',
    true
  );
  const isOpen = storedIsOpen ?? true;
  const [isOptionsOpen, setIsOptionsOpen] = useState(false);
  const { euiTheme } = useEuiTheme();

  const [cardsContainer, setCardsContainer] = useState<HTMLDivElement | null>(null);
  const { width: containerWidth } = useResizeObserver(cardsContainer);
  const visibleCardCount =
    containerWidth > 0
      ? Math.max(
          1,
          Math.min(
            MAX_VISIBLE_CARDS,
            Math.floor((containerWidth + CARD_GAP) / (MIN_CARD_WIDTH + CARD_GAP))
          )
        )
      : MAX_VISIBLE_CARDS;
  const toggleOptions = useCallback(() => setIsOptionsOpen((prev) => !prev), []);
  const closeOptions = useCallback(() => setIsOptionsOpen(false), []);
  const toggleOpen = useCallback(
    // `react-use`'s `useLocalStorage` setter closes over a stale `state` value
    // (its deps omit `state`), so a functional updater like `prev => !prev` only
    // flips correctly on the first click. Pass the current value explicitly.
    () => setStoredIsOpen(!(storedIsOpen ?? true)),
    [setStoredIsOpen, storedIsOpen]
  );

  const { getUrlForApp } = useKibana().services.application;
  const genAiSettingsUrl = getUrlForApp('management', { path: '/ai/genAiSettings' });

  const isAgentChatExperienceDisabled = !isAgentChatExperienceEnabled;
  const hasNoConnectorSelected = isAgentChatExperienceEnabled && !hasValidConnector;
  const generateTooltipContent = hasWritePermissionError
    ? i18n.GENERATE_DISABLED_NO_WRITE_PERMISSION_TOOLTIP
    : hasNoConnectorSelected
    ? i18n.GENERATE_DISABLED_NO_CONNECTOR_TOOLTIP
    : undefined;
  const isGenerateDisabled = !!hasWritePermissionError || hasNoConnectorSelected;
  const renderCount = Math.min(leads.length, visibleCardCount);
  const hasFewLeads = leads.length < visibleCardCount;
  const openGenAiSettingsButton = (
    <EuiButton
      size="s"
      fill
      iconType="popout"
      iconSide="right"
      href={genAiSettingsUrl}
      target="_blank"
      data-test-subj="openGenAiSettingsButton"
    >
      {i18n.OPEN_GENAI_SETTINGS}
    </EuiButton>
  );

  // Once a generation run has completed but found nothing, "Regenerate" is a
  // low-emphasis retry rather than the primary call-to-action, so it's
  // rendered as a plain link-style button instead of the prominent AI button
  // used to kick off the first generation.
  const generateActionButton = hasGenerated ? (
    <EuiToolTip content={generateTooltipContent}>
      <EuiButtonEmpty
        size="s"
        iconType="refresh"
        isLoading={isGenerating}
        isDisabled={isGenerateDisabled}
        onClick={onGenerate}
        data-test-subj="generateLeadsButton"
      >
        {i18n.REGENERATE}
      </EuiButtonEmpty>
    </EuiToolTip>
  ) : (
    <EuiToolTip content={generateTooltipContent}>
      <AiButton
        size="s"
        iconType="sparkles"
        isLoading={isGenerating}
        isDisabled={isGenerateDisabled}
        onClick={onGenerate}
        data-test-subj="generateLeadsButton"
      >
        {i18n.GENERATE_LEADS}
      </AiButton>
    </EuiToolTip>
  );

  const optionsPopover = isAgentChatExperienceEnabled ? (
    <EuiPopover
      isOpen={isOptionsOpen}
      closePopover={closeOptions}
      ownFocus={false}
      anchorPosition="downRight"
      panelPaddingSize="m"
      aria-label={i18n.OPTIONS}
      button={
        <EuiToolTip content={i18n.OPTIONS} disableScreenReaderOutput>
          <EuiButtonIcon
            iconType="boxesVertical"
            aria-label={i18n.OPTIONS}
            onClick={toggleOptions}
            data-test-subj="leadsOptionsButton"
          />
        </EuiToolTip>
      }
    >
      <div style={{ width: 320 }}>
        <EuiFlexGroup direction="column" gutterSize="xs">
          <EuiFlexItem>
            <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiIcon type="plugs" aria-hidden={true} />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiText size="s">
                  <strong>{i18n.CONNECTOR_LABEL}</strong>
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem>
            <ConnectorSelectorInline
              fullWidth
              onConnectorSelected={noop}
              onConnectorIdSelected={onConnectorIdSelected}
              selectedConnectorId={connectorId}
              loadConnectorFeatureId="lead_generation"
              explicitConnectorSelection
            />
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiHorizontalRule margin="s" />
        <EuiSwitch
          label={i18n.AUTO_GENERATE_LABEL}
          checked={isScheduled}
          onChange={(e) => onToggleSchedule(e.target.checked)}
          disabled={!connectorId}
          data-test-subj="autoGenerateSwitch"
        />
      </div>
    </EuiPopover>
  ) : null;

  // While there are no leads to show (including while a generation run is in
  // progress), the whole panel collapses into a single slim banner row
  // instead of the full header + body layout used once leads exist.
  if (leads.length === 0 && (isGenerating || !isLoading)) {
    const description = isGenerating
      ? i18n.GENERATING_LEADS_DESCRIPTION
      : hasGenerated
      ? i18n.NO_DATA_DESCRIPTION
      : isAgentChatExperienceDisabled
      ? i18n.NO_AGENT_CHAT_EXPERIENCE_DESCRIPTION
      : hasNoConnectorSelected
      ? i18n.NO_CONNECTOR_SELECTED_DESCRIPTION
      : i18n.NO_LEADS_DESCRIPTION;

    const actions = isGenerating ? undefined : isAgentChatExperienceDisabled ? (
      openGenAiSettingsButton
    ) : (
      <>
        {generateActionButton}
        {optionsPopover}
      </>
    );

    return (
      <div data-test-subj="topThreatHuntingLeads">
        <LeadsBanner
          description={description}
          actions={actions}
          isLoading={isGenerating}
          data-test-subj="leadsEmptyPrompt"
        />
      </div>
    );
  }

  return (
    <EuiPanel hasBorder data-test-subj="topThreatHuntingLeads" color="subdued">
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false} wrap>
        <EuiFlexItem grow={false}>
          <EuiToolTip content={isOpen ? i18n.COLLAPSE : i18n.EXPAND} disableScreenReaderOutput>
            <EuiButtonIcon
              iconType={isOpen ? 'arrowDown' : 'arrowRight'}
              onClick={toggleOpen}
              aria-label={isOpen ? i18n.COLLAPSE : i18n.EXPAND}
              color="text"
              size="xs"
            />
          </EuiToolTip>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
            <EuiFlexItem grow={1} style={{ minWidth: 0 }}>
              <EuiTitle size="s">
                <h3 className="eui-textTruncate">{i18n.TOP_THREAT_HUNTING_LEADS_TITLE}</h3>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <AiIcon iconType="sparkles" size="m" aria-label="AI Assistant" />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiBetaBadge
                label="Tech Preview"
                iconType="flask"
                aria-hidden={true}
                tooltipContent={i18n.EXPERIMENTAL_TOOLTIP}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem />
        <EuiFlexItem grow={false} css={{ marginLeft: 'auto' }}>
          <EuiFlexGroup
            alignItems="center"
            gutterSize="s"
            responsive={false}
            wrap
            justifyContent="flexEnd"
          >
            {leads.length > 0 && lastRunTimestamp && (
              <EuiFlexItem grow={false}>
                <EuiText size="xs" color="subdued" data-test-subj="leadsGeneratedTimestamp">
                  <GeneratedOnLabel timestamp={lastRunTimestamp} />
                </EuiText>
              </EuiFlexItem>
            )}
            {leads.length > 0 && (
              <EuiFlexItem grow={false}>
                <EuiToolTip content={generateTooltipContent}>
                  <EuiButtonEmpty
                    size="s"
                    iconType="refresh"
                    isLoading={isGenerating}
                    isDisabled={isGenerateDisabled}
                    onClick={onGenerate}
                    data-test-subj="refreshLeadsButton"
                  >
                    {i18n.REGENERATE}
                  </EuiButtonEmpty>
                </EuiToolTip>
              </EuiFlexItem>
            )}
            {leads.length > 0 && (
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  size="s"
                  iconType="list"
                  onClick={onSeeAll}
                  data-test-subj="seeAllLeadsButton"
                >
                  {i18n.getSeeAllLeadsLabel(totalCount)}
                </EuiButtonEmpty>
              </EuiFlexItem>
            )}
            {leads.length > 0 && (
              <EuiFlexItem grow={false}>
                <AiButton
                  size="s"
                  iconType="productAgent"
                  onClick={onHuntInChat}
                  data-test-subj="huntInChatButton"
                >
                  {i18n.HUNT_WITH_AI}
                </AiButton>
              </EuiFlexItem>
            )}
            {optionsPopover && <EuiFlexItem grow={false}>{optionsPopover}</EuiFlexItem>}
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
      {isOpen && (
        <>
          <EuiSpacer size="m" />
          {isLoading ? (
            <div
              style={{
                overflow: 'hidden',
                padding: euiTheme.size.base,
                margin: `-${euiTheme.size.s}`,
              }}
              data-test-subj="leadsLoadingSkeleton"
            >
              <EuiFlexGroup gutterSize="m" responsive={false} wrap={false}>
                {Array.from({ length: MAX_VISIBLE_CARDS }, (_, index) => (
                  <EuiFlexItem key={index} style={{ minWidth: 0, maxWidth: MAX_CARD_WIDTH }}>
                    <EuiPanel paddingSize="m" hasBorder={false} hasShadow={false}>
                      <EuiSkeletonTitle size="xs" />
                      <EuiSpacer size="s" />
                      <EuiSkeletonText lines={3} size="s" />
                    </EuiPanel>
                  </EuiFlexItem>
                ))}
              </EuiFlexGroup>
            </div>
          ) : (
            <div
              ref={setCardsContainer}
              style={{
                overflow: 'hidden',
                padding: euiTheme.size.base,
                margin: `-${euiTheme.size.s}`,
              }}
            >
              <EuiFlexGroup
                gutterSize="m"
                responsive={false}
                wrap={false}
                justifyContent={hasFewLeads ? 'flexStart' : undefined}
              >
                {leads.slice(0, renderCount).map((lead) => (
                  <EuiFlexItem
                    key={lead.id}
                    grow={!hasFewLeads}
                    style={{
                      minWidth: 0,
                      maxWidth: hasFewLeads ? MAX_CARD_WIDTH : undefined,
                    }}
                  >
                    <LeadCard lead={lead} onClick={onLeadClick} />
                  </EuiFlexItem>
                ))}
              </EuiFlexGroup>
            </div>
          )}
        </>
      )}
    </EuiPanel>
  );
};
