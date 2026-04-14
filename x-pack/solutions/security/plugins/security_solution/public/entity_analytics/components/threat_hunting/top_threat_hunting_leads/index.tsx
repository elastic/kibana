/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiPanel,
  EuiSwitch,
  EuiTitle,
  EuiToolTip,
} from '@elastic/eui';
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
  onSeeAll: () => void;
  onLeadClick: (lead: HuntingLead) => void;
  onHuntInChat: () => void;
  onLeadInfoClick?: (lead: HuntingLead) => void;
  onGenerate: () => void;
  isScheduled?: boolean;
  onToggleSchedule?: (enabled: boolean) => void;
}

export const TopThreatHuntingLeads: React.FC<TopThreatHuntingLeadsProps> = ({
  leads,
  totalCount,
  isLoading,
  isGenerating,
  hasGenerated,
  onSeeAll,
  onLeadClick,
  onHuntInChat,
  onLeadInfoClick,
  onGenerate,
  isScheduled,
  onToggleSchedule,
}) => {
  return (
    <EuiPanel hasBorder data-test-subj="topThreatHuntingLeads">
      <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiTitle size="xs">
                <h3>{i18n.TOP_HUNTING_LEADS_TITLE}</h3>
              </EuiTitle>
            </EuiFlexItem>
            {totalCount > 0 && (
              <EuiFlexItem grow={false}>
                <EuiBadge color="hollow">{totalCount}</EuiBadge>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem />
        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="s" responsive={false} alignItems="center">
            {onToggleSchedule && (
              <EuiFlexItem grow={false}>
                <EuiToolTip content={i18n.SCHEDULE_TOOLTIP}>
                  <EuiSwitch
                    label={i18n.AUTO_REFRESH}
                    checked={!!isScheduled}
                    onChange={(e) => onToggleSchedule(e.target.checked)}
                    compressed
                    data-test-subj="leadScheduleToggle"
                  />
                </EuiToolTip>
              </EuiFlexItem>
            )}
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
            {leads.length > 0 && (
              <>
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty
                    size="s"
                    iconType="discuss"
                    onClick={onHuntInChat}
                    data-test-subj="huntInChatButton"
                  >
                    {i18n.HUNT_IN_CHAT}
                  </EuiButtonEmpty>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty
                    size="s"
                    iconType="list"
                    onClick={onSeeAll}
                    data-test-subj="seeAllLeadsButton"
                  >
                    {i18n.SEE_ALL_LEADS}
                  </EuiButtonEmpty>
                </EuiFlexItem>
              </>
            )}
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>

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
        <EuiFlexGroup gutterSize="m" wrap responsive style={{ marginTop: 12 }}>
          {leads.slice(0, MAX_VISIBLE_CARDS).map((lead) => (
            <EuiFlexItem key={lead.id} grow={1}>
              <LeadCard lead={lead} onClick={onLeadClick} onInfoClick={onLeadInfoClick} />
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>
      )}
    </EuiPanel>
  );
};
