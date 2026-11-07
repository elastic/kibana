/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  RiskScoreHistoryEntry,
  RiskScoreHistoryResponse,
} from '../../../../common/api/entity_analytics';
import type { RiskScoreInput } from '../../../../common/api/entity_analytics/common';
import type { IntelligenceEntity } from './common';
import {
  securityFindingKey,
  securityInvocationReferenceKey,
} from './ai_agents/security_graph_model';
import type { SecurityFinding } from './security_findings/types';

export type EntityAgentAttribution =
  | 'authenticated_requester'
  | 'local_account'
  | 'runtime_principal'
  | 'entity_reference'
  | 'unverified_account';

export interface EntityAgentAction {
  key: string;
  finding: SecurityFinding;
  findings: SecurityFinding[];
  attribution: EntityAgentAttribution;
  riskInputs: RiskScoreInput[];
  riskInputsVerified: boolean;
}

export interface EntityRiskInputResolution {
  alias?: string;
  complete: boolean;
  references: Array<{ id: string; index: string }>;
}

export interface EntityAgentStory {
  actions: EntityAgentAction[];
  latestScore?: RiskScoreHistoryEntry;
  riskInputsAvailable: boolean;
  matchedAlertCount: number;
}

const identityAttribution = (
  entity: IntelligenceEntity,
  finding: SecurityFinding
): EntityAgentAttribution | undefined => {
  if (!finding.agent || !finding.policy) return;
  const explicitMatch = finding.entityIds.includes(entity.id);
  if (finding.entityIds.length > 0 && !explicitMatch) return;
  const actorSource = finding.invocation?.actorSource ?? finding.actor?.provenance;
  if (entity.type === 'user' && finding.actor?.name === entity.identifierValue) {
    if (entity.identityId && finding.actor.id !== entity.identityId) {
      return explicitMatch ? 'entity_reference' : undefined;
    }
    if (
      (explicitMatch || Boolean(entity.identityId && entity.identityId === finding.actor.id)) &&
      ((finding.agent.provider === 'google_adk' &&
        actorSource === 'google_signed_id_token_verified_by_application') ||
        (finding.agent.provider === 'agent_builder' &&
          ['kibana_authc', 'conversation_round_author'].includes(actorSource ?? '')))
    ) {
      return 'authenticated_requester';
    }
    return actorSource === 'local_os_account' ? 'local_account' : 'unverified_account';
  }
  if (
    entity.type === 'service' &&
    finding.invocation?.runtimePrincipal === entity.identifierValue
  ) {
    return 'runtime_principal';
  }
  return explicitMatch ? 'entity_reference' : undefined;
};

const outcomeRank = (finding: SecurityFinding): number =>
  finding.outcome === 'blocked' ? 2 : finding.kind === 'policy_violation' ? 1 : 0;

export const latestEntityRiskScore = (
  entity: IntelligenceEntity,
  history?: RiskScoreHistoryResponse
): RiskScoreHistoryEntry | undefined =>
  history?.entity_id === entity.id && history.entity_type === entity.type
    ? [...history.entries]
        .filter((entry) => Number.isFinite(Date.parse(entry['@timestamp'])))
        .sort((a, b) => Date.parse(b['@timestamp']) - Date.parse(a['@timestamp']))[0]
    : undefined;

export const entityRiskInputMatchesFinding = (
  input: RiskScoreInput,
  finding: SecurityFinding,
  resolution?: EntityRiskInputResolution
): boolean =>
  input.id === finding.source.id &&
  (input.index === finding.source.index ||
    Boolean(
      resolution &&
        input.index === resolution.alias &&
        resolution.complete &&
        resolution.references.some(
          (reference) =>
            reference.id === finding.source.id && reference.index === finding.source.index
        )
    ));

/** Connects exact entity attribution and immutable tool references to the latest native risk inputs. */
export const buildEntityAgentStory = (
  entity: IntelligenceEntity,
  findings: SecurityFinding[],
  history?: RiskScoreHistoryResponse,
  resolution?: EntityRiskInputResolution
): EntityAgentStory => {
  const latestScore = latestEntityRiskScore(entity, history);
  const groups = new Map<string, EntityAgentAction>();
  const seen = new Set<string>();
  findings.forEach((finding) => {
    const attribution = identityAttribution(entity, finding);
    const findingKey = securityFindingKey(finding);
    if (!attribution || seen.has(findingKey)) return;
    seen.add(findingKey);
    const reference = securityInvocationReferenceKey(finding);
    const key = reference
      ? JSON.stringify([
          reference,
          finding.actor?.id,
          finding.actor?.name,
          finding.invocation?.runtimePrincipal,
          attribution,
        ])
      : findingKey;
    const riskInputs = (latestScore?.inputs ?? []).filter(
      (input) =>
        entityRiskInputMatchesFinding(input, finding, resolution) &&
        (!input.entity_id || input.entity_id === entity.id)
    );
    const riskInputsVerified =
      latestScore?.inputs !== undefined &&
      !latestScore.inputs.some(
        (input) =>
          input.id === finding.source.id &&
          input.index === resolution?.alias &&
          !resolution?.complete
      );
    const group = groups.get(key);
    if (group) {
      group.findings.push(finding);
      group.riskInputs.push(...riskInputs);
      group.riskInputsVerified = group.riskInputsVerified && riskInputsVerified;
      if (outcomeRank(finding) > outcomeRank(group.finding)) group.finding = finding;
      return;
    }
    groups.set(key, {
      key,
      finding,
      findings: [finding],
      attribution,
      riskInputs,
      riskInputsVerified,
    });
  });
  const actions = [...groups.values()].sort(
    (a, b) => Date.parse(b.finding.timestamp) - Date.parse(a.finding.timestamp)
  );
  actions.forEach((action) => {
    action.riskInputs = [
      ...new Map(
        action.riskInputs.map((input) => [JSON.stringify([input.index, input.id]), input])
      ).values(),
    ];
  });
  return {
    actions,
    latestScore,
    riskInputsAvailable: latestScore?.inputs !== undefined,
    matchedAlertCount: actions.reduce((count, action) => count + action.riskInputs.length, 0),
  };
};

/** Builds an application-relative link using the provider's recorded session identity. */
export const entityAgentSessionPath = (finding: SecurityFinding): string | undefined => {
  const agent = finding.agent;
  if (!agent?.id || !agent.sessionId) return;
  const params = new URLSearchParams({
    tab: 'explorer',
    scope: 'agents',
    agentSource: agent.provider,
    sessionId:
      agent.provider === 'agent_builder'
        ? agent.sessionId
        : JSON.stringify([agent.id, agent.sessionId]),
  });
  if (agent.provider === 'agent_builder') params.set('agentId', agent.id);
  return `/entity_intelligence?${params}`;
};
