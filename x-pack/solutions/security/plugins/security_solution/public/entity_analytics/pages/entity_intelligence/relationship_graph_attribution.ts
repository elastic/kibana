/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { EntityAgentAttribution } from './entity_agent_activity_model';

export interface RelationshipAgentAttributionLabel {
  label: string;
  evidence: string;
  description: string;
  verified: boolean;
}

/** Describes the observed identity relationship without inferring human intent or credential delegation. */
export const relationshipAgentAttribution = (
  attribution: EntityAgentAttribution | undefined
): RelationshipAgentAttributionLabel => {
  switch (attribution) {
    case 'authenticated_requester':
      return {
        label: i18n.translate(
          'xpack.securitySolution.entityAnalytics.intelligence.agentGraph.attribution.requestedLabel',
          { defaultMessage: 'Requested agent work' }
        ),
        evidence: i18n.translate(
          'xpack.securitySolution.entityAnalytics.intelligence.agentGraph.attribution.requestedEvidence',
          { defaultMessage: 'Verified requester account' }
        ),
        description: i18n.translate(
          'xpack.securitySolution.entityAnalytics.intelligence.agentGraph.attribution.requestedDescription',
          {
            defaultMessage:
              "This account authenticated the request associated with this agent activity. This does not establish credential delegation or the person's intent.",
          }
        ),
        verified: true,
      };
    case 'runtime_principal':
      return {
        label: i18n.translate(
          'xpack.securitySolution.entityAnalytics.intelligence.agentGraph.attribution.runtimeLabel',
          { defaultMessage: 'Agent runs as this identity' }
        ),
        evidence: i18n.translate(
          'xpack.securitySolution.entityAnalytics.intelligence.agentGraph.attribution.runtimeEvidence',
          { defaultMessage: 'Recorded runtime identity' }
        ),
        description: i18n.translate(
          'xpack.securitySolution.entityAnalytics.intelligence.agentGraph.attribution.runtimeDescription',
          {
            defaultMessage:
              'The recorded agent execution used this runtime identity. This does not establish who requested the work or who owns the account.',
          }
        ),
        verified: true,
      };
    case 'local_account':
      return {
        label: i18n.translate(
          'xpack.securitySolution.entityAnalytics.intelligence.agentGraph.attribution.localLabel',
          { defaultMessage: 'Linked local account' }
        ),
        evidence: i18n.translate(
          'xpack.securitySolution.entityAnalytics.intelligence.agentGraph.attribution.localEvidence',
          { defaultMessage: 'Requester unverified' }
        ),
        description: i18n.translate(
          'xpack.securitySolution.entityAnalytics.intelligence.agentGraph.attribution.localDescription',
          {
            defaultMessage:
              'The agent activity is linked to this local operating system account. The record does not verify who requested the work.',
          }
        ),
        verified: false,
      };
    case 'unverified_account':
      return {
        label: i18n.translate(
          'xpack.securitySolution.entityAnalytics.intelligence.agentGraph.attribution.unverifiedLabel',
          { defaultMessage: 'Reported requester' }
        ),
        evidence: i18n.translate(
          'xpack.securitySolution.entityAnalytics.intelligence.agentGraph.attribution.unverifiedEvidence',
          { defaultMessage: 'Not verified' }
        ),
        description: i18n.translate(
          'xpack.securitySolution.entityAnalytics.intelligence.agentGraph.attribution.unverifiedDescription',
          {
            defaultMessage:
              'The record names this account, but its authentication evidence does not verify the requester.',
          }
        ),
        verified: false,
      };
    case 'entity_reference':
    default:
      return {
        label: i18n.translate(
          'xpack.securitySolution.entityAnalytics.intelligence.agentGraph.attribution.referenceLabel',
          { defaultMessage: 'Linked in evidence' }
        ),
        evidence: i18n.translate(
          'xpack.securitySolution.entityAnalytics.intelligence.agentGraph.attribution.referenceEvidence',
          { defaultMessage: 'Requester unverified' }
        ),
        description: i18n.translate(
          'xpack.securitySolution.entityAnalytics.intelligence.agentGraph.attribution.referenceDescription',
          {
            defaultMessage:
              'The evidence links this identity to the agent activity without establishing that the identity requested or executed it.',
          }
        ),
        verified: false,
      };
  }
};

/** Names the recorded execution identity without substituting a requester or agent owner. */
export const relationshipAgentRuntimeLabel = (principal?: string): string =>
  principal?.trim()
    ? i18n.translate(
        'xpack.securitySolution.entityAnalytics.intelligence.agentGraph.attribution.runsAs',
        { defaultMessage: 'Runs as {principal}', values: { principal: principal.trim() } }
      )
    : i18n.translate(
        'xpack.securitySolution.entityAnalytics.intelligence.agentGraph.attribution.noRuntime',
        { defaultMessage: 'Execution identity not recorded' }
      );
