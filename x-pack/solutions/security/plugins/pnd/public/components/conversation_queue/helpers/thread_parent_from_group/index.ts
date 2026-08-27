/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  deriveConversationIds,
  getGateDefinitionByGateId,
  type PndConversation,
  type PndProposalRow,
} from '@kbn/pnd-common';

import type { QueueParent } from '../../../queue';
import { NO_INVESTIGATION_GROUP_KEY } from '../group_proposals_by_investigation';
import type { PndInvestigationGroup } from '../group_proposals_by_investigation';
import { readInvestigationTitles } from '../read_investigation_titles';
import * as i18n from '../../translations';

export interface ThreadParentFromGroupArgs {
  conversations: readonly PndConversation[];
  investigationGroup: PndInvestigationGroup;
  riskScore?: number;
}

/**
 * True when every pending gate sits under an incident that already exists (containment, tuning).
 * The promote gate *opens* the incident, so its parent is still the investigation.
 */
const citesExistingIncident = (proposals: readonly PndProposalRow[]): boolean =>
  proposals.length > 0 &&
  proposals.every((proposal) => {
    const gate = getGateDefinitionByGateId(proposal.gateId);

    return gate != null && gate.parentKind === 'incident' && gate.role !== 'container';
  });

/**
 * The {@link QueueParent} a {@link ThreadGroupCard} header *is* for one
 * investigation or incident (or the container-less group). Titles come off the
 * matching conversation; the id is derived so opening chat still has a target
 * when the conversations read has not landed.
 */
export const threadParentFromGroup = ({
  conversations,
  investigationGroup,
  riskScore,
}: ThreadParentFromGroupArgs): QueueParent => {
  const { correlationId, key, proposals } = investigationGroup;

  if (correlationId == null || key === NO_INVESTIGATION_GROUP_KEY) {
    return {
      id: key,
      summary: investigationGroup.proposals[0]?.correlationId ?? '',
      title: i18n.NOT_YET_IN_AN_INVESTIGATION,
      ...(riskScore == null ? {} : { riskScore }),
    };
  }

  const parentKind = citesExistingIncident(proposals) ? 'incident' : 'investigation';
  const titles = readInvestigationTitles(conversations);
  const conversation = conversations.find(
    ({ correlationId: alertId, kind }) => kind === parentKind && alertId === correlationId
  );
  const derivedIds = deriveConversationIds(correlationId);

  return {
    id:
      conversation?.id ??
      (parentKind === 'incident'
        ? derivedIds.incidentConversationId
        : derivedIds.investigationConversationId),
    summary: correlationId,
    title:
      parentKind === 'incident'
        ? conversation?.title.trim() || i18n.UNNAMED_INCIDENT
        : titles.get(correlationId) ?? i18n.UNNAMED_INVESTIGATION,
    ...(riskScore == null ? {} : { riskScore }),
    ...(conversation?.updatedAt == null ? {} : { updatedAt: conversation.updatedAt }),
  };
};
