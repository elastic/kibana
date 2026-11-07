/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type {
  BriefAgentFinding,
  BriefAgentLimitation,
  BriefAgentSourceStatus,
  BriefSourceStatus,
  ExecutiveBriefCoverage,
} from './executive_brief_agents';

const providerStatuses: Record<BriefAgentSourceStatus, string> = {
  available: i18n.translate(
    'xpack.securitySolution.entityAnalytics.intelligence.brief.source.available',
    { defaultMessage: 'Available' }
  ),
  empty: i18n.translate('xpack.securitySolution.entityAnalytics.intelligence.brief.source.empty', {
    defaultMessage: 'No activity observed',
  }),
  partial: i18n.translate(
    'xpack.securitySolution.entityAnalytics.intelligence.brief.source.partial',
    { defaultMessage: 'Partial evidence' }
  ),
  unavailable: i18n.translate(
    'xpack.securitySolution.entityAnalytics.intelligence.brief.source.unavailable',
    { defaultMessage: 'Unavailable' }
  ),
  loading: i18n.translate(
    'xpack.securitySolution.entityAnalytics.intelligence.brief.source.loading',
    { defaultMessage: 'Loading' }
  ),
};

const coverageSources: Record<keyof ExecutiveBriefCoverage, string> = {
  entityStore: i18n.translate(
    'xpack.securitySolution.entityAnalytics.intelligence.brief.coverage.entityStore',
    { defaultMessage: 'Entity Store' }
  ),
  entities: i18n.translate(
    'xpack.securitySolution.entityAnalytics.intelligence.brief.coverage.entities',
    { defaultMessage: 'Entity inventory' }
  ),
  detections: i18n.translate(
    'xpack.securitySolution.entityAnalytics.intelligence.brief.coverage.detections',
    { defaultMessage: 'Detection evidence' }
  ),
  anomalies: i18n.translate(
    'xpack.securitySolution.entityAnalytics.intelligence.brief.coverage.anomalies',
    { defaultMessage: 'ML anomalies' }
  ),
  huntingLeads: i18n.translate(
    'xpack.securitySolution.entityAnalytics.intelligence.brief.coverage.huntingLeads',
    { defaultMessage: 'Hunting leads' }
  ),
};

const limitations: Record<BriefAgentLimitation, string> = {
  mcp_connection_not_chat: i18n.translate(
    'xpack.securitySolution.entityAnalytics.intelligence.brief.limitation.mcpConnection',
    {
      defaultMessage:
        'Claude Desktop activity is grouped by MCP connection, which can span multiple chats. Prompts, chat IDs and the authenticated requester are not observed. The local OS account and client-reported identity do not establish the human caller.',
    }
  ),
  source_unavailable: i18n.translate(
    'xpack.securitySolution.entityAnalytics.intelligence.brief.limitation.unavailable',
    {
      defaultMessage:
        'A source is unavailable. Combined totals are withheld where coverage is incomplete.',
    }
  ),
  source_partial: i18n.translate(
    'xpack.securitySolution.entityAnalytics.intelligence.brief.limitation.partial',
    {
      defaultMessage:
        'A source returned partial evidence. Its displayed counts describe the loaded sample.',
    }
  ),
  incomplete_sessions: i18n.translate(
    'xpack.securitySolution.entityAnalytics.intelligence.brief.limitation.incompleteSessions',
    {
      defaultMessage:
        'Some session records are incomplete and cannot support a complete behavior comparison.',
    }
  ),
  mixed_models: i18n.translate(
    'xpack.securitySolution.entityAnalytics.intelligence.brief.limitation.mixedModels',
    {
      defaultMessage:
        'Sessions using multiple models are excluded from matched behavior baselines.',
    }
  ),
  unknown_outcomes: i18n.translate(
    'xpack.securitySolution.entityAnalytics.intelligence.brief.limitation.unknownOutcomes',
    { defaultMessage: 'Unrecorded tool outcomes are unknown; they are not counted as successes.' }
  ),
  limited_baseline: i18n.translate(
    'xpack.securitySolution.entityAnalytics.intelligence.brief.limitation.baseline',
    {
      defaultMessage:
        'Behavior findings cover only sessions with comparable recorded history. No finding does not establish normal behavior.',
    }
  ),
  agent_builder_baseline: i18n.translate(
    'xpack.securitySolution.entityAnalytics.intelligence.brief.limitation.builderBaseline',
    {
      defaultMessage: 'A complete historical behavior baseline is not available for Agent Builder.',
    }
  ),
  local_owner_not_caller: i18n.translate(
    'xpack.securitySolution.entityAnalytics.intelligence.brief.limitation.owner',
    {
      defaultMessage:
        'Local installation ownership does not establish the authenticated person behind a request.',
    }
  ),
  cumulative_observations: i18n.translate(
    'xpack.securitySolution.entityAnalytics.intelligence.brief.limitation.cumulative',
    {
      defaultMessage:
        'External session tool observations are cumulative snapshots and can include activity before the selected lookback.',
    }
  ),
};

/** Formats the recorded availability of an agent evidence source. */
export const briefProviderStatusLabel = (status: BriefAgentSourceStatus): string =>
  providerStatuses[status];

/** Formats the availability of a traditional identity evidence source. */
export const briefCoverageStatusLabel = (status: BriefSourceStatus): string =>
  status === 'disabled'
    ? i18n.translate('xpack.securitySolution.entityAnalytics.intelligence.brief.source.disabled', {
        defaultMessage: 'Disabled',
      })
    : providerStatuses[status];

/** Names a source consistently in the brief and its exported snapshot. */
export const briefCoverageSourceLabel = (source: keyof ExecutiveBriefCoverage): string =>
  coverageSources[source];

/** Explains the practical limit of a source without turning missing evidence into assurance. */
export const briefLimitationLabel = (limitation: BriefAgentLimitation): string =>
  limitations[limitation];

/** Describes a measured behavior finding using its recorded units and baseline. */
export const briefFindingDescription = (finding: BriefAgentFinding): string => {
  if (finding.kind === 'new_tool') {
    return i18n.translate(
      'xpack.securitySolution.entityAnalytics.intelligence.brief.finding.newTool',
      {
        defaultMessage:
          '{tool}: {observed, plural, one {# observation} other {# observations}}; absent from {baseline, plural, one {# comparable prior session} other {# comparable prior sessions}}.',
        values: {
          tool: finding.toolName ?? '—',
          observed: finding.observed,
          baseline: finding.baselineSampleSize,
        },
      }
    );
  }
  if (finding.kind === 'failure_rate_increase') {
    return i18n.translate(
      'xpack.securitySolution.entityAnalytics.intelligence.brief.finding.failureRate',
      {
        defaultMessage:
          'Known-outcome failure rate: {observed}% versus {baseline}% in the baseline.',
        values: {
          observed: Math.round(finding.observed * 100),
          baseline: finding.baseline === undefined ? '—' : Math.round(finding.baseline * 100),
        },
      }
    );
  }
  if (finding.kind === 'repeated_tool_failures') {
    return i18n.translate(
      'xpack.securitySolution.entityAnalytics.intelligence.brief.finding.repeatedFailures',
      {
        defaultMessage:
          '{tool}: {observed, number} consecutive observed failures within the configured time window.',
        values: { tool: finding.toolName ?? '—', observed: finding.observed },
      }
    );
  }
  if (finding.kind === 'duration_increase') {
    return i18n.translate(
      'xpack.securitySolution.entityAnalytics.intelligence.brief.finding.duration',
      {
        defaultMessage:
          'Recorded duration: {observed, number} ms versus a baseline median of {baseline} ms.',
        values: { observed: finding.observed, baseline: finding.baseline?.toLocaleString() ?? '—' },
      }
    );
  }
  return i18n.translate(
    'xpack.securitySolution.entityAnalytics.intelligence.brief.finding.volume',
    {
      defaultMessage:
        'Tool observations: {observed, number} versus a baseline median of {baseline}; threshold {threshold, number}.',
      values: {
        observed: finding.observed,
        baseline: finding.baseline?.toLocaleString() ?? '—',
        threshold: finding.threshold,
      },
    }
  );
};
