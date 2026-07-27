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
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { Proposal, ProposalStatus } from '@kbn/pnd-common';
import { PndPageSection } from '../../components/layout/pnd_page_section';
import { PndPageHeader } from '../../components/pnd_page_header';
import { usePndDocTitle } from '../../hooks/use_pnd_doc_title';
import {
  useInvestigation,
  useInvestigationProposals,
  useGenerateProposal,
} from '../../hooks/use_investigations_api';
import type { GenerateProposalProvenance } from '../../hooks/use_investigations_api';
import * as i18n from './translations';

const ProposalRow: React.FC<{
  proposal: Proposal;
  investigationId: string;
  isSelected: boolean;
  onStatusChange: (proposalId: string, status: ProposalStatus) => void;
}> = ({ proposal, investigationId, isSelected, onStatusChange }) => {
  const { http, notifications } = useKibana().services;
  const [isLoading, setIsLoading] = useState(false);

  const handleAction = async (action: 'accept' | 'reject' | 'modify') => {
    setIsLoading(true);
    try {
      let endpoint = `/internal/pnd/investigations/${investigationId}/proposals/${proposal.id}`;
      let newStatus: ProposalStatus;
      const body: Record<string, unknown> = {};

      if (action === 'accept') {
        endpoint = `${endpoint}/accept`;
        newStatus = 'approved';
      } else if (action === 'reject') {
        endpoint = `${endpoint}/reject`;
        newStatus = 'dismissed';
        body.reason = 'Dismissed by analyst';
      } else {
        endpoint = `${endpoint}/modify`;
        newStatus = 'modified';
        body.reasoning = 'Modified by analyst review';
      }

      const result = (await http!.post(endpoint, {
        body: JSON.stringify(body),
      })) as {
        escalation?: { triggered?: boolean; completed?: boolean; workflowExecutionId?: string };
      };

      onStatusChange(proposal.id, newStatus);
      if (action === 'accept' && result?.escalation?.triggered) {
        notifications?.toasts.addSuccess(
          result.escalation.completed
            ? `Escalation Watch workflow completed (${result.escalation.workflowExecutionId})`
            : `Escalation Watch workflow triggered (${result.escalation.workflowExecutionId})`
        );
      } else {
        notifications?.toasts.addSuccess(`Proposal ${newStatus}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      notifications?.toasts.addError(new Error(message), {
        title: `Failed to ${action} proposal`,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const statusColors: Record<ProposalStatus, string> = {
    pending: '#FFFFFF',
    approved: '#E8F5E9',
    dismissed: '#F5F5F5',
    modified: '#E3F2FD',
    executed: '#C8E6C9',
    escalated: '#FFF3E0',
    deferred: '#F5F5F5',
  };

  return (
    <EuiPanel
      paddingSize="m"
      color={isSelected ? 'primary' : undefined}
      style={isSelected ? undefined : { backgroundColor: statusColors[proposal.status] }}
      data-test-subj={`pndProposalRow-${proposal.id}`}
    >
      <EuiFlexGroup justifyContent="spaceBetween" alignItems="flexStart">
        <EuiFlexItem>
          <EuiText size="s">
            <p>
              <strong>
                {(proposal as any).type
                  ? `${(proposal as any).type} Proposal`
                  : (proposal as any).summary || 'Proposal'}
              </strong>
            </p>
            {(proposal as any).confidence && (
              <p style={{ color: '#666', fontSize: '0.9em' }}>
                Confidence: {((proposal as any).confidence * 100).toFixed(0)}%
              </p>
            )}
            <p>
              {(proposal as any).reasoning ||
                (proposal as any).recommendation ||
                'No details available'}
            </p>
            {proposal.status !== 'pending' && (
              <p style={{ color: '#666', fontSize: '0.85em', marginTop: '0.5rem' }}>
                Status: <strong>{proposal.status}</strong>
              </p>
            )}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
      {proposal.status === 'pending' && (
        <>
          <EuiSpacer size="s" />
          <EuiFlexGroup gutterSize="s">
            <EuiFlexItem grow={false}>
              <EuiButton
                size="s"
                color="success"
                onClick={() => handleAction('accept')}
                isLoading={isLoading}
                disabled={isLoading}
              >
                {i18n.ACTION_APPROVE}
              </EuiButton>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                size="s"
                color="text"
                onClick={() => handleAction('modify')}
                isLoading={isLoading}
                disabled={isLoading}
              >
                {i18n.ACTION_MODIFY}
              </EuiButton>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                size="s"
                color="danger"
                onClick={() => handleAction('reject')}
                isLoading={isLoading}
                disabled={isLoading}
              >
                {i18n.ACTION_DISMISS}
              </EuiButtonEmpty>
            </EuiFlexItem>
          </EuiFlexGroup>
        </>
      )}
    </EuiPanel>
  );
};

export const InvestigationDetailPage: React.FC = () => {
  const { services } = useKibana();
  const { id, proposalId } = useParams<{ id: string; proposalId?: string }>();
  const { data, isLoading, error, refetch } = useInvestigation(id);
  const proposalsQuery = useInvestigationProposals(id);
  const [localStatuses, setLocalStatuses] = useState<Record<string, ProposalStatus>>({});
  const [selectedTabId, setSelectedTabId] = useState('overview');
  const [generatedProposal, setGeneratedProposal] = useState<Proposal | null>(null);
  const [provenance, setProvenance] = useState<GenerateProposalProvenance | null>(null);
  const generateProposal = useGenerateProposal(id);
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

  const onStatusChange = (nextProposalId: string, status: ProposalStatus) => {
    setLocalStatuses((current) => ({ ...current, [nextProposalId]: status }));
    services.notifications?.toasts.addSuccess(i18n.STATUS_UPDATED);
  };

  const onGenerateProposal = async () => {
    try {
      const result = await generateProposal.mutateAsync();
      setGeneratedProposal(result.proposal);
      setProvenance(result.provenance);
      setSelectedTabId('proposals');
      services.notifications?.toasts.addSuccess(
        `Watch workflow proposal generated (${result.provenance.stepType})`
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      services.notifications?.toasts.addError(new Error(message), {
        title: 'Failed to generate LLM proposal',
      });
    }
  };

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
        <PndPageHeader title={i18n.PAGE_TITLE} backTo={{ path: '/', label: i18n.BACK_TO_BRIEF }} />
        <EuiEmptyPrompt iconType="alert" title={<h2>{i18n.NOT_FOUND}</h2>} />
      </PndPageSection>
    );
  }

  if (error || !data?.investigation) {
    return (
      <PndPageSection>
        <PndPageHeader title={i18n.PAGE_TITLE} backTo={{ path: '/', label: i18n.BACK_TO_BRIEF }} />
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
          <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" gutterSize="s">
            <EuiFlexItem grow={false}>
              <EuiSpacer size="m" />
              <EuiText size="s">
                <strong>Analyst proposals</strong>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiSpacer size="m" />
              <EuiButton
                size="s"
                iconType="sparkles"
                fill
                isLoading={generateProposal.isLoading}
                onClick={onGenerateProposal}
                data-test-subj="pndGenerateProposalButton"
              >
                Generate with LLM
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="m" />

          {generatedProposal && provenance ? (
            <>
              <EuiCallOut
                announceOnMount
                title={`Watch workflow · ${provenance.stepType} step · ${provenance.latencyMs}ms${
                  provenance.tokenUsage ? ` · ${provenance.tokenUsage.totalTokens} tokens` : ''
                }`}
                color="primary"
                iconType="sparkles"
                size="s"
                data-test-subj="pndLlmProvenance"
              >
                <EuiText size="xs">
                  This proposal was produced by a live Watch workflow (ai.agent reasoning step), not
                  seed data. Execution: {provenance.workflowExecutionId}
                </EuiText>
              </EuiCallOut>
              <EuiSpacer size="s" />
              <ProposalRow
                proposal={generatedProposal}
                investigationId={id!}
                isSelected={false}
                onStatusChange={onStatusChange}
              />
              <EuiSpacer size="m" />
            </>
          ) : null}

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
            <EuiEmptyPrompt iconType="alert" title={<h3>{i18n.PROPOSAL_NOT_FOUND}</h3>} />
          ) : null}
          {!proposalsQuery.isLoading && !proposalsQuery.error && hasRequestedProposal ? (
            proposals.length === 0 ? (
              <EuiText>No proposals available</EuiText>
            ) : (
              proposals.map((proposal) => (
                <React.Fragment key={proposal.id}>
                  <ProposalRow
                    proposal={proposal}
                    investigationId={id!}
                    isSelected={proposal.id === proposalId}
                    onStatusChange={onStatusChange}
                  />
                  <EuiSpacer size="m" />
                </React.Fragment>
              ))
            )
          ) : null}
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
      <PndPageHeader
        title={investigation.title}
        subtitle={investigation.affectedSurface}
        backTo={{ path: '/', label: i18n.BACK_TO_BRIEF }}
      />
      <EuiTabbedContent
        key={`${id}:${proposalId ?? 'overview'}`}
        tabs={tabs}
        initialSelectedTab={initialTab}
        onTabClick={(tab) => setSelectedTabId(tab.id)}
      />
    </PndPageSection>
  );
};
