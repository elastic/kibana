/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useState } from 'react';
import type { EuiTabbedContentTab } from '@elastic/eui';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiPanel,
  EuiSpacer,
  EuiTabbedContent,
  EuiText,
} from '@elastic/eui';
import { useParams } from 'react-router-dom';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { Proposal, ProposalStatus } from '@kbn/pnd-common';
import { PndPageSection } from '../../components/layout/pnd_page_section';
import { PndPageHeader } from '../../components/pnd_page_header';
import { usePndDocTitle } from '../../hooks/use_pnd_doc_title';
import { useInvestigation, useInvestigationProposals } from '../../hooks/use_investigations_api';
import * as i18n from './translations';

const ProposalRow: React.FC<{
  proposal: Proposal;
  onStatusChange: (proposalId: string, status: ProposalStatus) => void;
}> = ({ proposal, onStatusChange }) => (
  <EuiPanel paddingSize="m" data-test-subj={`pndProposalRow-${proposal.id}`}>
    <EuiText size="s">
      <p>
        <strong>{proposal.summary}</strong>
      </p>
      <p>{proposal.recommendation}</p>
    </EuiText>
    <EuiSpacer size="s" />
    <EuiFlexGroup gutterSize="s">
      <EuiFlexItem grow={false}>
        <EuiButton size="s" onClick={() => onStatusChange(proposal.id, 'approved')}>
          {i18n.ACTION_APPROVE}
        </EuiButton>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButton size="s" color="text" onClick={() => onStatusChange(proposal.id, 'modified')}>
          {i18n.ACTION_MODIFY}
        </EuiButton>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButtonEmpty size="s" onClick={() => onStatusChange(proposal.id, 'dismissed')}>
          {i18n.ACTION_DISMISS}
        </EuiButtonEmpty>
      </EuiFlexItem>
    </EuiFlexGroup>
  </EuiPanel>
);

export const InvestigationDetailPage: React.FC = () => {
  const { services } = useKibana();
  const { id, proposalId } = useParams<{ id: string; proposalId?: string }>();
  const { data, isLoading, error } = useInvestigation(id);
  const proposalsQuery = useInvestigationProposals(id);
  const [localStatuses, setLocalStatuses] = useState<Record<string, ProposalStatus>>({});
  const [selectedTabId, setSelectedTabId] = useState('overview');
  usePndDocTitle(data?.investigation?.title ?? i18n.PAGE_TITLE);

  useEffect(() => {
    setLocalStatuses({});
    setSelectedTabId(proposalId ? 'proposals' : 'overview');
  }, [id, proposalId]);

  const proposals = useMemo(() => {
    return (proposalsQuery.data?.proposals ?? []).map((proposal) => ({
      ...proposal,
      status: localStatuses[proposal.id] ?? proposal.status,
    }));
  }, [localStatuses, proposalsQuery.data?.proposals]);

  useEffect(() => {
    if (!proposalId) {
      return;
    }
    const hasProposal = proposals.some((proposal) => proposal.id === proposalId);
    if (hasProposal) {
      setSelectedTabId('proposals');
    }
  }, [proposalId, proposals]);

  const onStatusChange = (nextProposalId: string, status: ProposalStatus) => {
    setLocalStatuses((current) => ({ ...current, [nextProposalId]: status }));
    services.notifications?.toasts.addSuccess(i18n.STATUS_UPDATED);
  };

  if (isLoading) {
    return (
      <PndPageSection>
        <EuiLoadingSpinner size="xl" aria-label={i18n.LOADING} />
      </PndPageSection>
    );
  }

  if (error || !data?.investigation) {
    return (
      <PndPageSection>
        <PndPageHeader title={i18n.PAGE_TITLE} backTo={{ path: '/', label: i18n.BACK_TO_BRIEF }} />
        <EuiEmptyPrompt iconType="alert" title={<h2>{i18n.NOT_FOUND}</h2>} />
      </PndPageSection>
    );
  }

  const { investigation } = data;

  const tabs: EuiTabbedContentTab[] = [
    {
      id: 'overview',
      name: i18n.TAB_OVERVIEW,
      content: (
        <EuiText>
          <p>{investigation.summary}</p>
          <p>
            <strong>{investigation.affectedSurface}</strong>
          </p>
        </EuiText>
      ),
    },
    {
      id: 'proposals',
      name: i18n.TAB_PROPOSALS,
      content: (
        <>
          {proposals.map((proposal) => (
            <React.Fragment key={proposal.id}>
              <ProposalRow proposal={proposal} onStatusChange={onStatusChange} />
              <EuiSpacer size="m" />
            </React.Fragment>
          ))}
        </>
      ),
    },
    {
      id: 'timeline',
      name: i18n.TAB_TIMELINE,
      content: (
        <EuiText size="s">
          <ul>
            {investigation.events.map((event) => (
              <li key={event.id}>
                {event.timestamp}: {event.summary}
              </li>
            ))}
          </ul>
        </EuiText>
      ),
    },
  ];

  const selectedTab = tabs.find((tab) => tab.id === selectedTabId) ?? tabs[0];

  return (
    <PndPageSection>
      <PndPageHeader
        title={investigation.title}
        subtitle={investigation.affectedSurface}
        backTo={{ path: '/', label: i18n.BACK_TO_BRIEF }}
      />
      <EuiTabbedContent
        tabs={tabs}
        selectedTab={selectedTab}
        onTabClick={(tab) => setSelectedTabId(tab.id)}
        autoFocus="selected"
      />
    </PndPageSection>
  );
};
