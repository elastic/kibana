/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BehaviorFindingKind } from './ai_agents/behavior_types';
import type { CodexSession } from './ai_agents/codex_types';
import { getCodexSessionModels, getCodexSessionTitle } from './ai_agents/codex_model';
import { externalAgentLabel } from './ai_agents/external_agent_provider';
import type { ExternalAgentProvider } from './ai_agents/external_agent_provider';
import type { AgentEvidenceSource, AgentInventoryResult } from './ai_agents/types';
import { AGENT_LOOKBACK_DAYS } from './ai_agents/queries';
import { summarizeOverviewSessions } from './overview_operations_model';

export type BriefSourceStatus = 'loading' | 'available' | 'partial' | 'unavailable' | 'disabled';

export interface ExecutiveBriefCoverage {
  entityStore: BriefSourceStatus;
  entities: BriefSourceStatus;
  detections: BriefSourceStatus;
  anomalies: BriefSourceStatus;
  huntingLeads: BriefSourceStatus;
}

export type BriefAgentSourceStatus = 'loading' | 'available' | 'empty' | 'partial' | 'unavailable';
export type BriefAgentProvider = ExternalAgentProvider | 'agent_builder';
export type BriefAgentLimitation =
  | 'source_unavailable'
  | 'source_partial'
  | 'incomplete_sessions'
  | 'mixed_models'
  | 'unknown_outcomes'
  | 'limited_baseline'
  | 'agent_builder_baseline'
  | 'local_owner_not_caller'
  | 'cumulative_observations'
  | 'mcp_connection_not_chat';

export interface BriefAgentProviderSummary {
  provider: BriefAgentProvider;
  name: string;
  status: BriefAgentSourceStatus;
  definitionsStatus?: BriefAgentSourceStatus;
  activityStatus?: BriefAgentSourceStatus;
  identityCount?: number;
  sessions?: number;
  grouping?: 'session' | 'mcp_connection';
  toolObservations?: number;
  failedToolObservations?: number;
  unknownToolOutcomes?: number;
  evaluatedSessions?: number;
  changedSessions?: number;
  partialSessions?: number;
  mixedModelSessions?: number;
  localOwnerSessions?: number;
  invocations?: number;
  failedInvocations?: number;
}

export interface BriefAgentFinding {
  kind: BehaviorFindingKind;
  toolName?: string;
  observed: number;
  baseline?: number;
  threshold: number;
  baselineSampleSize: number;
}

export interface BriefAgentChangedSession {
  provider: ExternalAgentProvider;
  agentId: string;
  sessionId: string;
  routeKey: string;
  title: string;
  lastSeen: string;
  source: AgentEvidenceSource;
  findings: BriefAgentFinding[];
}

export interface BriefBuilderAgentEvidence {
  agentId: string;
  name: string;
  invocations?: number;
  failedInvocations?: number;
  configuredTools: number;
  configuredConnectors: number;
  creatorRecorded: boolean;
}

export interface ExecutiveBriefAgentSnapshot {
  lookbackDays: number;
  providers: BriefAgentProviderSummary[];
  totals: {
    agentIdentities?: number;
    externalSessions?: number;
    toolObservations?: number;
    failedToolObservations?: number;
    unknownToolOutcomes?: number;
    evaluatedSessions?: number;
    changedSessions?: number;
    builderInvocations?: number;
  };
  changedSessions: BriefAgentChangedSession[];
  builderAgents: BriefBuilderAgentEvidence[];
  limitations: BriefAgentLimitation[];
}

export interface BriefExternalAgentInput {
  sessions: readonly CodexSession[];
  isLoading: boolean;
  unavailable: boolean;
  partial: boolean;
}

export type BriefBuilderAgentInput = Pick<
  AgentInventoryResult,
  'agents' | 'isLoading' | 'status' | 'definitionsStatus' | 'activityStatus'
>;

export const MAX_BRIEF_AGENT_SESSIONS = 6;
export const MAX_BRIEF_AGENT_FINDINGS = 3;
export const MAX_BRIEF_BUILDER_AGENTS = 5;
export const MAX_BRIEF_AGENT_LABEL = 160;

const compactLabel = (value: string): string =>
  value.replace(/\s+/g, ' ').trim().slice(0, MAX_BRIEF_AGENT_LABEL);

const latestSessions = (
  input: BriefExternalAgentInput,
  provider: ExternalAgentProvider
): CodexSession[] => {
  if (input.unavailable || input.isLoading) return [];
  const unique = new Map<string, CodexSession>();
  input.sessions.forEach((session) => {
    if ((session.provider ?? 'codex') !== provider) return;
    const key = JSON.stringify([session.agentId, session.id]);
    const previous = unique.get(key);
    if (
      !previous ||
      Date.parse(session.ingestedAt ?? session.lastSeen) >
        Date.parse(previous.ingestedAt ?? previous.lastSeen)
    )
      unique.set(key, session);
  });
  return [...unique.values()];
};

const summarizeExternal = (
  provider: ExternalAgentProvider,
  input: BriefExternalAgentInput
): { provider: BriefAgentProviderSummary; changes: BriefAgentChangedSession[] } => {
  const sessions = latestSessions(input, provider);
  const summary = summarizeOverviewSessions(sessions);
  const status: BriefAgentSourceStatus = input.isLoading
    ? 'loading'
    : input.unavailable
    ? 'unavailable'
    : input.partial
    ? 'partial'
    : sessions.length
    ? 'available'
    : 'empty';
  if (status === 'loading' || status === 'unavailable') {
    return { provider: { provider, name: externalAgentLabel(provider), status }, changes: [] };
  }
  return {
    provider: {
      provider,
      name: externalAgentLabel(provider),
      status,
      identityCount: summary.installations,
      sessions: summary.sessions,
      grouping: provider === 'claude_desktop' ? 'mcp_connection' : 'session',
      toolObservations: summary.observations,
      failedToolObservations: summary.failures,
      unknownToolOutcomes: summary.unknownOutcomes,
      evaluatedSessions: summary.evaluatedSessions,
      changedSessions: summary.changedSessions,
      partialSessions: sessions.filter((session) => !session.summaryComplete).length,
      mixedModelSessions: sessions.filter((session) => getCodexSessionModels(session).length > 1)
        .length,
      localOwnerSessions: sessions.filter(
        (session) => session.owner?.provenance === 'local_os_account'
      ).length,
    },
    changes: summary.signals.slice(0, MAX_BRIEF_AGENT_SESSIONS).map(({ session, findings }) => ({
      provider,
      agentId: session.agentId,
      sessionId: session.id,
      routeKey: JSON.stringify([session.agentId, session.id]),
      title: compactLabel(getCodexSessionTitle(session)),
      lastSeen: session.lastSeen,
      source: { index: session.source.index, id: session.source.id },
      findings: findings.slice(0, MAX_BRIEF_AGENT_FINDINGS).map((finding) => ({
        kind: finding.kind,
        toolName: finding.toolName ? compactLabel(finding.toolName) : undefined,
        observed: finding.observed,
        baseline: finding.baseline,
        threshold: finding.threshold,
        baselineSampleSize: finding.baselineSampleSize,
      })),
    })),
  };
};

const sourceComplete = (status: BriefAgentSourceStatus): boolean =>
  status === 'available' || status === 'empty';

/** Builds bounded metadata evidence from the same scoped sources and behavior model as Overview. */
export const buildExecutiveBriefAgentSnapshot = ({
  codex,
  cursor,
  claudeDesktop,
  googleAdk,
  builder,
}: {
  codex: BriefExternalAgentInput;
  cursor: BriefExternalAgentInput;
  claudeDesktop?: BriefExternalAgentInput;
  googleAdk?: BriefExternalAgentInput;
  builder: BriefBuilderAgentInput;
}): ExecutiveBriefAgentSnapshot => {
  const external = [
    summarizeExternal('codex', codex),
    summarizeExternal('cursor', cursor),
    ...(claudeDesktop ? [summarizeExternal('claude_desktop', claudeDesktop)] : []),
    ...(googleAdk ? [summarizeExternal('google_adk', googleAdk)] : []),
  ];
  const definitionsComplete = !builder.isLoading && sourceComplete(builder.definitionsStatus);
  const activityComplete = definitionsComplete && sourceComplete(builder.activityStatus);
  const agents = definitionsComplete ? builder.agents : [];
  const invocations = activityComplete
    ? agents.reduce((sum, agent) => sum + (agent.activity?.invocations ?? 0), 0)
    : undefined;
  const builderSummary: BriefAgentProviderSummary = {
    provider: 'agent_builder',
    name: 'Agent Builder',
    status: builder.isLoading ? 'loading' : builder.status,
    definitionsStatus: builder.isLoading ? 'loading' : builder.definitionsStatus,
    activityStatus: builder.isLoading ? 'loading' : builder.activityStatus,
    identityCount: definitionsComplete ? agents.length : undefined,
    invocations,
    failedInvocations: activityComplete
      ? agents.reduce((sum, agent) => sum + (agent.activity?.failedInvocations ?? 0), 0)
      : undefined,
  };
  const externalComplete = external.every((source) => sourceComplete(source.provider.status));
  const sumExternal = (
    field: keyof Pick<
      BriefAgentProviderSummary,
      | 'identityCount'
      | 'sessions'
      | 'toolObservations'
      | 'failedToolObservations'
      | 'unknownToolOutcomes'
      | 'evaluatedSessions'
      | 'changedSessions'
    >
  ): number | undefined =>
    externalComplete
      ? external.reduce((sum, source) => sum + (source.provider[field] ?? 0), 0)
      : undefined;
  const providers = [...external.map((source) => source.provider), builderSummary];
  const limitations: BriefAgentLimitation[] = [];
  if (
    external.some(
      ({ provider }) => provider.provider === 'claude_desktop' && (provider.sessions ?? 0) > 0
    )
  )
    limitations.push('mcp_connection_not_chat');
  if (providers.some((provider) => provider.status === 'unavailable'))
    limitations.push('source_unavailable');
  if (providers.some((provider) => provider.status === 'partial'))
    limitations.push('source_partial');
  if (external.some(({ provider }) => (provider.partialSessions ?? 0) > 0))
    limitations.push('incomplete_sessions');
  if (external.some(({ provider }) => (provider.mixedModelSessions ?? 0) > 0))
    limitations.push('mixed_models');
  if (external.some(({ provider }) => (provider.unknownToolOutcomes ?? 0) > 0))
    limitations.push('unknown_outcomes');
  if (external.some(({ provider }) => (provider.sessions ?? 0) > (provider.evaluatedSessions ?? 0)))
    limitations.push('limited_baseline');
  if (agents.length) limitations.push('agent_builder_baseline');
  if (
    external.some(
      ({ provider }) => provider.provider !== 'google_adk' && (provider.sessions ?? 0) > 0
    )
  ) {
    limitations.push('local_owner_not_caller', 'cumulative_observations');
  }
  return {
    lookbackDays: AGENT_LOOKBACK_DAYS,
    providers,
    totals: {
      agentIdentities:
        externalComplete && definitionsComplete
          ? (sumExternal('identityCount') ?? 0) + agents.length
          : undefined,
      externalSessions: sumExternal('sessions'),
      toolObservations: sumExternal('toolObservations'),
      failedToolObservations: sumExternal('failedToolObservations'),
      unknownToolOutcomes: sumExternal('unknownToolOutcomes'),
      evaluatedSessions: sumExternal('evaluatedSessions'),
      changedSessions: sumExternal('changedSessions'),
      builderInvocations: invocations,
    },
    changedSessions: external
      .flatMap((source) => source.changes)
      .sort((left, right) => Date.parse(right.lastSeen) - Date.parse(left.lastSeen))
      .slice(0, MAX_BRIEF_AGENT_SESSIONS),
    builderAgents: [...agents]
      .sort(
        (left, right) =>
          (right.activity?.invocations ?? 0) - (left.activity?.invocations ?? 0) ||
          left.id.localeCompare(right.id)
      )
      .slice(0, MAX_BRIEF_BUILDER_AGENTS)
      .map((agent) => ({
        agentId: agent.id,
        name: compactLabel(agent.name),
        invocations: activityComplete ? agent.activity?.invocations ?? 0 : undefined,
        failedInvocations: activityComplete ? agent.activity?.failedInvocations ?? 0 : undefined,
        configuredTools: agent.configuredTools.length,
        configuredConnectors: agent.connectorIds.length,
        creatorRecorded: Boolean(agent.owner?.id || agent.owner?.name),
      })),
    limitations,
  };
};
