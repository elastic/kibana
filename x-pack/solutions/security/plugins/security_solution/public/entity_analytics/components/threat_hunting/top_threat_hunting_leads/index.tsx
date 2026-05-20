/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIcon,
  EuiImage,
  EuiLoadingLogo,
  EuiPanel,
  EuiPopover,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  EuiTitle,
  EuiToolTip,
  EuiBetaBadge,
  useResizeObserver,
} from '@elastic/eui';
import { ConnectorSelectorInline } from '@kbn/elastic-assistant';
import { noop } from 'lodash/fp';
import { AiButton, AiIcon } from '@kbn/shared-ux-ai-components';
import { useKibana } from '../../../../common/lib/kibana';
import type { HuntingLead } from './types';
import { LeadCard } from './lead_card';
import * as i18n from './translations';
import illustrationGenAi from '../../../../common/images/illustration_genai_transparent_background.svg';

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
  const [isOpen, setIsOpen] = useState(true);
  const [isOptionsOpen, setIsOptionsOpen] = useState(false);

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
  const toggleOpen = useCallback(() => setIsOpen((prev) => !prev), []);

  const { getUrlForApp } = useKibana().services.application;
  const genAiSettingsUrl = getUrlForApp('management', { path: '/ai/genAiSettings' });

  const showHeaderGenerate = !isOpen && leads.length === 0 && !hasGenerated;
  const generateTooltipContent = hasWritePermissionError
    ? i18n.GENERATE_DISABLED_NO_WRITE_PERMISSION_TOOLTIP
    : !hasValidConnector
    ? i18n.GENERATE_DISABLED_NO_CONNECTOR_TOOLTIP
    : undefined;
  const isGenerateDisabled = !hasValidConnector || !!hasWritePermissionError;
  const renderCount = Math.min(leads.length, visibleCardCount);
  const hasFewLeads = leads.length < visibleCardCount;

  return (
    <EuiPanel hasBorder data-test-subj="topThreatHuntingLeads" color="subdued">
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiButtonIcon
            iconType={isOpen ? 'arrowDown' : 'arrowRight'}
            onClick={toggleOpen}
            aria-label={isOpen ? 'Collapse' : 'Expand'}
            color="text"
            size="xs"
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
            <EuiFlexItem grow={1} style={{ minWidth: 0 }}>
              <EuiTitle size="m">
                <h2 className="eui-textTruncate">{i18n.TOP_THREAT_HUNTING_LEADS_TITLE}</h2>
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
                tooltipContent="This functionality is in technical preview and may be changed or removed completely in a future release. Elastic will work to fix any issues, but features in technical preview are not subject to the support SLA of official GA features."
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem />
        <EuiFlexItem grow={false}>
          <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false} wrap>
            {leads.length > 0 && lastRunTimestamp && (
              <EuiFlexItem grow={false}>
                <EuiText size="xs" color="subdued" data-test-subj="leadsGeneratedTimestamp">
                  {i18n.getGeneratedOnLabel(lastRunTimestamp)}
                </EuiText>
              </EuiFlexItem>
            )}
            {leads.length > 0 && (
              <EuiFlexItem grow={false}>
                <EuiToolTip
                  content={
                    hasWritePermissionError
                      ? i18n.GENERATE_DISABLED_NO_WRITE_PERMISSION_TOOLTIP
                      : undefined
                  }
                >
                  <EuiButtonEmpty
                    size="s"
                    iconType="refresh"
                    isLoading={isGenerating}
                    isDisabled={!!hasWritePermissionError}
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
            {showHeaderGenerate && (
              <EuiFlexItem grow={false}>
                {!isAgentChatExperienceEnabled ? (
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
                ) : (
                  <EuiToolTip content={generateTooltipContent}>
                    <AiButton
                      size="s"
                      iconType="sparkles"
                      isLoading={isGenerating}
                      isDisabled={isGenerateDisabled}
                      onClick={onGenerate}
                      data-test-subj="headerGenerateLeadsButton"
                    >
                      {i18n.GENERATE_LEADS}
                    </AiButton>
                  </EuiToolTip>
                )}
              </EuiFlexItem>
            )}
            {isAgentChatExperienceEnabled && (
              <EuiFlexItem grow={false}>
                <EuiPopover
                  isOpen={isOptionsOpen}
                  closePopover={closeOptions}
                  ownFocus={false}
                  anchorPosition="downRight"
                  panelPaddingSize="m"
                  aria-label={i18n.OPTIONS}
                  button={
                    <EuiButtonIcon
                      iconType="boxesVertical"
                      aria-label={i18n.OPTIONS}
                      onClick={toggleOptions}
                      data-test-subj="leadsOptionsButton"
                    />
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
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
      {isOpen && (
        <>
          <EuiSpacer size="m" />
          {isLoading || (isGenerating && leads.length === 0) ? (
            <EuiPanel color="plain" hasBorder={false} hasShadow={false}>
              <EuiFlexGroup
                direction="column"
                justifyContent="center"
                alignItems="center"
                style={{ minHeight: 120 }}
              >
                <EuiFlexItem grow={false}>
                  <EuiLoadingLogo
                    logo="logoSecurity"
                    size="l"
                    data-test-subj="leadsLoadingSpinner"
                  />
                </EuiFlexItem>
                {isGenerating && (
                  <EuiFlexItem grow={false}>
                    <p>{i18n.GENERATING_LEADS_DESCRIPTION}</p>
                  </EuiFlexItem>
                )}
              </EuiFlexGroup>
            </EuiPanel>
          ) : leads.length === 0 ? (
            <EuiPanel color="plain" hasBorder={false} hasShadow={false}>
              {hasGenerated ? (
                <EuiEmptyPrompt
                  iconType="inspect"
                  color="transparent"
                  title={<h3>{i18n.NO_DATA_TITLE}</h3>}
                  body={<p>{i18n.NO_DATA_DESCRIPTION}</p>}
                  actions={
                    !isAgentChatExperienceEnabled ? (
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
                    )
                  }
                  data-test-subj="leadsEmptyPrompt"
                />
              ) : (
                <EuiEmptyPrompt
                  layout="horizontal"
                  color="transparent"
                  style={{ maxWidth: 620 }}
                  body={
                    <p>
                      {!isAgentChatExperienceEnabled
                        ? i18n.NO_CONNECTOR_DESCRIPTION
                        : i18n.NO_LEADS_DESCRIPTION}
                    </p>
                  }
                  actions={
                    !isAgentChatExperienceEnabled ? (
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
                    )
                  }
                  icon={<EuiImage size={128} alt="" url={illustrationGenAi} />}
                  data-test-subj="leadsEmptyPrompt"
                />
              )}
            </EuiPanel>
          ) : (
            <div ref={setCardsContainer} style={{ overflow: 'hidden', padding: 16, margin: -8 }}>
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
