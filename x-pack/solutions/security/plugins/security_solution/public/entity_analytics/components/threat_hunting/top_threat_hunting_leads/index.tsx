/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import {
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiImage,
  EuiLoadingLogo,
  EuiPanel,
  EuiPopover,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  EuiTitle,
  EuiBetaBadge,
} from '@elastic/eui';
import { AiButton, AiIcon } from '@kbn/shared-ux-ai-components';
import type { HuntingLead } from './types';
import { LeadCard } from './lead_card';
import * as i18n from './translations';
import illustrationGenAi from '../../../../common/images/illustration_genai.svg';

const MAX_VISIBLE_CARDS = 5;

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
}) => {
  const [isOpen, setIsOpen] = useState(true);
  const [isOptionsOpen, setIsOptionsOpen] = useState(false);
  const toggleOptions = useCallback(() => setIsOptionsOpen((prev) => !prev), []);
  const closeOptions = useCallback(() => setIsOptionsOpen(false), []);
  const toggleOpen = useCallback(() => setIsOpen((prev) => !prev), []);

  const showHeaderGenerate = !isOpen && leads.length === 0 && !hasGenerated;

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
            <EuiFlexItem grow={false}>
              <EuiTitle size="xs">
                <h3>{i18n.TOP_THREAT_HUNTING_LEADS_TITLE}</h3>
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
                <EuiButtonEmpty
                  size="s"
                  iconType="refresh"
                  isLoading={isGenerating}
                  onClick={onGenerate}
                  data-test-subj="refreshLeadsButton"
                >
                  {i18n.REGENERATE}
                </EuiButtonEmpty>
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
                <AiButton
                  size="s"
                  iconType="sparkles"
                  isLoading={isGenerating}
                  onClick={onGenerate}
                  data-test-subj="headerGenerateLeadsButton"
                >
                  {i18n.GENERATE_LEADS}
                </AiButton>
              </EuiFlexItem>
            )}
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
                <EuiSwitch
                  label={i18n.AUTO_GENERATE_LABEL}
                  checked={isScheduled}
                  onChange={(e) => onToggleSchedule(e.target.checked)}
                  data-test-subj="autoGenerateSwitch"
                />
              </EuiPopover>
            </EuiFlexItem>
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
                    <AiButton
                      size="s"
                      iconType="sparkles"
                      isLoading={isGenerating}
                      onClick={onGenerate}
                      data-test-subj="generateLeadsButton"
                    >
                      {i18n.GENERATE_LEADS}
                    </AiButton>
                  }
                  data-test-subj="leadsEmptyPrompt"
                />
              ) : (
                <EuiEmptyPrompt
                  layout="horizontal"
                  color="transparent"
                  body={<p>{i18n.NO_LEADS_DESCRIPTION}</p>}
                  actions={
                    <AiButton
                      size="s"
                      iconType="sparkles"
                      isLoading={isGenerating}
                      onClick={onGenerate}
                      data-test-subj="generateLeadsButton"
                    >
                      {i18n.GENERATE_LEADS}
                    </AiButton>
                  }
                  icon={<EuiImage size={128} alt="" url={illustrationGenAi} />}
                  data-test-subj="leadsEmptyPrompt"
                />
              )}
            </EuiPanel>
          ) : (
            <EuiFlexGroup gutterSize="m" responsive={false} wrap={false}>
              {Array.from({ length: MAX_VISIBLE_CARDS }, (_, idx) => {
                const lead = leads[idx];
                return (
                  <EuiFlexItem key={lead?.id ?? `empty-${idx}`}>
                    {lead ? <LeadCard lead={lead} onClick={onLeadClick} /> : <div />}
                  </EuiFlexItem>
                );
              })}
            </EuiFlexGroup>
          )}
        </>
      )}
    </EuiPanel>
  );
};
