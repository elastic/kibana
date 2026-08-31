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
  EuiCallOut,
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
import { isHttpFetchError } from '@kbn/core-http-browser';
import type { Proposal } from '@kbn/pnd-common';
import { PndPageSection } from '../../components/layout/pnd_page_section';
import { usePndDocTitle } from '../../hooks/use_pnd_doc_title';
import { useInvestigation, useInvestigationProposals } from '../../hooks/use_investigations_api';
import * as i18n from './translations';

const ProposalRow: React.FC<{ proposal: Proposal; isSelected: boolean }> = ({
  proposal,
  isSelected,
}) => (
  <EuiPanel
    paddingSize="m"
    color={isSelected ? 'primary' : 'plain'}
    data-test-subj={`pndProposalRow-${proposal.id}`}
  >
    <EuiText size="s">
      <p>
        <strong>{proposal.summary}</strong>
      </p>
      <p>{proposal.recommendation}</p>
    </EuiText>
    <EuiSpacer size="s" />
    <EuiFlexGroup gutterSize="s">
      <EuiFlexItem grow={false}>
        <EuiButton size="s" disabled>
          {i18n.ACTION_APPROVE}
        </EuiButton>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButton size="s" color="text" disabled>
          {i18n.ACTION_MODIFY}
        </EuiButton>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButtonEmpty size="s" disabled>
          {i18n.ACTION_DISMISS}
        </EuiButtonEmpty>
      </EuiFlexItem>
    </EuiFlexGroup>
  </EuiPanel>
);

export const InvestigationDetailPage: React.FC = () => {
  const { id, proposalId } = useParams<{ id: string; proposalId?: string }>();
  const { data, isLoading, error, refetch } = useInvestigation(id);
  const proposalsQuery = useInvestigationProposals(id);
  const [selectedTabId, setSelectedTabId] = useState('overview');
  usePndDocTitle(data?.investigation?.title ?? i18n.PAGE_TITLE);

  useEffect(() => {
    setSelectedTabId(proposalId ? 'proposals' : 'overview');
  }, [id, proposalId]);

  const proposals = useMemo(
    () => proposalsQuery.data?.proposals ?? [],
    [proposalsQuery.data?.proposals]
  );
  const hasRequestedProposal =
    !proposalId || proposals.some((proposal) => proposal.id === proposalId);

  useEffect(() => {
    if (!proposalId) {
      return;
    }
    const hasProposal = proposals.some((proposal) => proposal.id === proposalId);
    if (hasProposal) {
      setSelectedTabId('proposals');
    }
  }, [proposalId, proposals]);

  if (isLoading) {
    return (
      <PndPageSection>
        <EuiLoadingSpinner size="xl" aria-label={i18n.LOADING} />
      </PndPageSection>
    );
  }

  const isNotFound =
    (isHttpFetchError(error) && error.response?.status === 404) || (!error && !data?.investigation);

  if (isNotFound) {
    return (
      <PndPageSection>
        <EuiEmptyPrompt iconType="warning" title={<h2>{i18n.NOT_FOUND}</h2>} />
      </PndPageSection>
    );
  }

  if (error || !data?.investigation) {
    return (
      <PndPageSection>
        <EuiEmptyPrompt
          iconType="error"
          color="danger"
          title={<h2>{i18n.LOAD_ERROR_TITLE}</h2>}
          body={<p>{i18n.LOAD_ERROR_BODY}</p>}
          actions={<EuiButton onClick={() => refetch()}>{i18n.RETRY}</EuiButton>}
        />
      </PndPageSection>
    );
  }

  const { investigation } = data;

  const tabs: EuiTabbedContentTab[] = [
    {
      id: 'overview',
      name: i18n.TAB_OVERVIEW,
      content: (
        <>
          <EuiSpacer size="m" />
          <EuiText>
            <p>{investigation.summary}</p>
            <p>
              <strong>{investigation.affectedSurface}</strong>
            </p>
          </EuiText>
        </>
      ),
    },
    {
      id: 'proposals',
      name: i18n.TAB_PROPOSALS,
      content: (
        <>
          <EuiSpacer size="m" />
          <EuiCallOut title={i18n.DECISIONS_UNAVAILABLE} iconType="info" />
          <EuiSpacer size="m" />
          {proposalsQuery.isLoading ? (
            <EuiLoadingSpinner size="l" aria-label={i18n.LOADING_PROPOSALS} />
          ) : null}
          {proposalsQuery.error ? (
            <EuiEmptyPrompt
              iconType="error"
              color="danger"
              title={<h3>{i18n.PROPOSALS_LOAD_ERROR}</h3>}
              actions={<EuiButton onClick={() => proposalsQuery.refetch()}>{i18n.RETRY}</EuiButton>}
            />
          ) : null}
          {!proposalsQuery.isLoading && !proposalsQuery.error && !hasRequestedProposal ? (
            <EuiEmptyPrompt iconType="warning" title={<h3>{i18n.PROPOSAL_NOT_FOUND}</h3>} />
          ) : null}
          {!proposalsQuery.isLoading && !proposalsQuery.error && hasRequestedProposal
            ? proposals.map((proposal) => (
                <React.Fragment key={proposal.id}>
                  <ProposalRow proposal={proposal} isSelected={proposal.id === proposalId} />
                  <EuiSpacer size="m" />
                </React.Fragment>
              ))
            : null}
        </>
      ),
    },
    {
      id: 'timeline',
      name: i18n.TAB_TIMELINE,
      content: (
        <>
          <EuiSpacer size="m" />
          <EuiText size="s">
            <ul>
              {(investigation.events ?? []).map((event) => (
                <li key={event.id}>
                  {event.timestamp}: {event.summary}
                </li>
              ))}
            </ul>
          </EuiText>
        </>
      ),
    },
  ];

  // Keep EuiTabbedContent uncontrolled. Controlled `selectedTab` + `autoFocus="selected"`
  // leaves internal selectedTabId undefined, so focusTab() crashes with
  // "Cannot read properties of null (reading 'focus')" on tab click.
  const initialTab = tabs.find((tab) => tab.id === selectedTabId) ?? tabs[0];

  return (
    <PndPageSection>
      <EuiTabbedContent
        key={`${id}:${proposalId ?? 'overview'}`}
        tabs={tabs}
        initialSelectedTab={initialTab}
        onTabClick={(tab) => setSelectedTabId(tab.id)}
      />
    </PndPageSection>
  );
};
