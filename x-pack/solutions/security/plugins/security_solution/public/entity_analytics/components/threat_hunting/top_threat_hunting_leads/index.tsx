/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import {
  EuiAccordion,
  EuiButton,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLoadingSpinner,
  EuiPanel,
  EuiPopover,
  EuiSwitch,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { AiButton } from '@kbn/shared-ux-ai-components';
import type { HuntingLead } from './types';
import { LeadCard } from './lead_card';
import * as i18n from './translations';

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
  onLeadInfoClick?: (lead: HuntingLead) => void;
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
  onLeadInfoClick,
  onGenerate,
}) => {
  const [isOptionsOpen, setIsOptionsOpen] = useState(false);
  const toggleOptions = useCallback(() => setIsOptionsOpen((prev) => !prev), []);
  const closeOptions = useCallback(() => setIsOptionsOpen(false), []);
  const buttonContent = (
    <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiTitle size="xs">
          <h3>{i18n.TOP_THREAT_HUNTING_LEADS_TITLE}</h3>
        </EuiTitle>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiIcon type="flask" aria-hidden={true} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );

  const extraAction = (
    <EuiFlexGroup gutterSize="s" responsive={false} alignItems="center">
      {leads.length > 0 ? (
        <>
          {lastRunTimestamp && (
            <EuiFlexItem grow={false}>
              <EuiText size="xs" color="subdued" data-test-subj="leadsGeneratedTimestamp">
                {i18n.getGeneratedOnLabel(lastRunTimestamp)}
              </EuiText>
            </EuiFlexItem>
          )}
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
        </>
      ) : (
        <EuiFlexItem grow={false}>
          <EuiButton
            size="s"
            iconType="sparkles"
            isLoading={isGenerating}
            onClick={onGenerate}
            data-test-subj="generateLeadsButton"
          >
            {isGenerating ? i18n.GENERATING_LEADS : i18n.GENERATE_LEADS}
          </EuiButton>
        </EuiFlexItem>
      )}
      {leads.length > 0 && (
        <>
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
        </>
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
  );

  return (
    <EuiPanel hasBorder data-test-subj="topThreatHuntingLeads" color="subdued">
      <EuiAccordion
        id="huntingLeadsAccordion"
        buttonContent={buttonContent}
        extraAction={extraAction}
        initialIsOpen
        paddingSize="m"
      >
        {isLoading || isGenerating ? (
          <EuiFlexGroup
            direction="column"
            justifyContent="center"
            alignItems="center"
            style={{ minHeight: 120 }}
          >
            <EuiFlexItem grow={false}>
              <EuiLoadingSpinner size="l" data-test-subj="leadsLoadingSpinner" />
            </EuiFlexItem>
            {isGenerating && (
              <EuiFlexItem grow={false}>
                <p>{i18n.GENERATING_LEADS_DESCRIPTION}</p>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        ) : leads.length === 0 ? (
          <EuiEmptyPrompt
            iconType={hasGenerated ? 'inspect' : 'searchProfilerApp'}
            title={<h3>{hasGenerated ? i18n.NO_DATA_TITLE : i18n.NO_LEADS_TITLE}</h3>}
            body={<p>{hasGenerated ? i18n.NO_DATA_DESCRIPTION : i18n.NO_LEADS_DESCRIPTION}</p>}
            data-test-subj="leadsEmptyPrompt"
          />
        ) : (
          <EuiFlexGroup gutterSize="m" responsive={false}>
            {leads.slice(0, MAX_VISIBLE_CARDS).map((lead) => (
              <EuiFlexItem key={lead.id}>
                <LeadCard lead={lead} onClick={onLeadClick} onInfoClick={onLeadInfoClick} />
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        )}
      </EuiAccordion>
    </EuiPanel>
  );
};
