/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { BoundInferenceClient } from '@kbn/inference-common';
import type { NightshiftTelemetryClient } from '../telemetry';
import { toolCallsFromRoundSteps, type RawRoundStep } from '../investigation_round';
import type { ActionsClient } from '../tools/sandbox_bash/agent_connectors';
import { ELASTICSEARCH_CONNECTOR_TYPE_ID, getProviderAdapter } from './adapters';
import { extractIdentityProposal, type ConnectorMetadata } from './extract';
import type { AlertOutcomeTrackingStore } from './tracking_store';
import type { IdentityProposal, ResolveResult, TrackingRecord } from './types';
import type { TrackSkipReason } from '../../common/workflows/steps/track_alert_outcome';

const MAX_CONNECTORS = 50;

export interface TrackOutcome {
  state?: 'tracking' | 'untrackable';
  reason?: string;
  source?: string;
  skip_reason?: TrackSkipReason;
}

/** The parts of an investigation subject the tracker reads. */
export interface TrackedSubject {
  subjectType: string;
  slack?: { thread_ts?: string; permalink?: string };
}

/** The parts of the investigation's first round the extractor reads. */
export interface FirstRound {
  message: string;
  startedAt?: string;
  steps: RawRoundStep[];
}

export interface TrackInvestigationDeps {
  trackingStore: AlertOutcomeTrackingStore;
  isEnabled: () => boolean;
  listSubjects: (investigationId: string) => Promise<TrackedSubject[]>;
  getFirstRound: (investigationId: string) => Promise<FirstRound | undefined>;
  actionsClient: Pick<ActionsClient, 'get' | 'getAll' | 'execute'>;
  getInferenceClient: () => Promise<BoundInferenceClient | undefined>;
  telemetry?: NightshiftTelemetryClient;
  logger: Logger;
  now?: () => Date;
}

export interface TrackInvestigationParams {
  spaceId: string;
  investigationId: string;
  automationId?: string;
  isFollowUp: boolean;
  investigationStartedAt: string;
  abortSignal?: AbortSignal;
}

/** Slack message timestamps are epoch seconds with a sequence suffix, like "1732481234.000200". */
export const slackTsToIso = (ts: string | undefined): string | undefined => {
  const seconds = ts ? Number.parseFloat(ts) : NaN;
  return Number.isFinite(seconds) && seconds > 0
    ? new Date(seconds * 1000).toISOString()
    : undefined;
};

const toConnectorMetadata = (
  connectors: Awaited<ReturnType<ActionsClient['getAll']>>
): ConnectorMetadata[] =>
  connectors.slice(0, MAX_CONNECTORS).map(({ id, name, actionTypeId, config }) => {
    // Only the cluster URL of Elasticsearch connectors: it is how a link's host is matched.
    const url =
      actionTypeId === ELASTICSEARCH_CONNECTOR_TYPE_ID && typeof config?.url === 'string'
        ? config.url
        : undefined;
    return { id, name, type: actionTypeId, ...(url ? { url } : {}) };
  });

const resolveProposal = async (
  proposal: IdentityProposal,
  postReceivedAt: string,
  actionsClient: TrackInvestigationDeps['actionsClient']
): Promise<ResolveResult> => {
  if (proposal.source === 'unknown') return { untrackable: 'insufficient_identity' };
  const adapter = getProviderAdapter(proposal.source);
  if (!adapter) return { untrackable: 'unsupported_source' };
  return adapter.resolve(proposal, { postReceivedAt }, { actionsClient });
};

/**
 * Extracts and verifies the identity of the alert an investigation's first round was about, and
 * writes its tracking record: `tracking` when an adapter resolved one exact alert instance, or
 * `untrackable` with the reason. Runs once per investigation; it never throws.
 */
export const trackInvestigationAlertOutcome = async (
  deps: TrackInvestigationDeps,
  params: TrackInvestigationParams
): Promise<TrackOutcome> => {
  const { trackingStore, telemetry, logger } = deps;
  const { spaceId, investigationId, automationId } = params;
  const now = deps.now ?? (() => new Date());
  if (!deps.isEnabled()) return { skip_reason: 'disabled' };
  if (params.isFollowUp) return { skip_reason: 'follow_up' };
  try {
    if (await trackingStore.get(spaceId, investigationId))
      return { skip_reason: 'already_tracked' };

    const subjects = await deps.listSubjects(investigationId);
    // Alerts on this cluster are already followed up from the rule's recovery event.
    if (subjects.some(({ subjectType }) => subjectType === 'alert')) {
      return { skip_reason: 'local_alert_subject' };
    }
    const round = await deps.getFirstRound(investigationId);
    if (!round) return { skip_reason: 'no_round' };
    const inferenceClient = await deps.getInferenceClient();
    if (!inferenceClient) return { skip_reason: 'model_unavailable' };

    const slack = subjects.find(({ subjectType }) => subjectType === 'slack_thread')?.slack;
    const postReceivedAt =
      slackTsToIso(slack?.thread_ts) ?? round.startedAt ?? params.investigationStartedAt;
    const subjectType = slack ? 'slack_thread' : subjects[0]?.subjectType;

    let proposal: IdentityProposal;
    try {
      proposal = await extractIdentityProposal({
        inferenceClient,
        abortSignal: params.abortSignal,
        input: {
          postText: round.message,
          postPermalink: slack?.permalink,
          postReceivedAt,
          connectors: toConnectorMetadata(await deps.actionsClient.getAll()),
          toolCalls: toolCallsFromRoundSteps(round.steps),
        },
      });
    } catch (error) {
      telemetry?.reportAlertOutcome({
        transition: 'extract_failed',
        ...(automationId ? { automation_id: automationId } : {}),
      });
      throw error;
    }

    const resolved = await resolveProposal(proposal, postReceivedAt, deps.actionsClient);
    const createdAt = now().toISOString();
    const base: TrackingRecord = {
      investigation_id: investigationId,
      space_id: spaceId,
      ...(automationId ? { automation_id: automationId } : {}),
      ...(subjectType ? { subject_type: subjectType } : {}),
      post_received_at: postReceivedAt,
      created_at: createdAt,
      updated_at: createdAt,
      state: 'untrackable',
      source: proposal.source,
      ...(proposal.connector_id ? { connector_id: proposal.connector_id } : {}),
      proposal,
      consecutive_failures: 0,
    };
    const record: TrackingRecord =
      'ref' in resolved
        ? { ...base, state: 'tracking', ref: resolved.ref, next_check_at: createdAt }
        : {
            ...base,
            untrackable_reason: resolved.untrackable,
            ...(resolved.detail ? { untrackable_detail: resolved.detail } : {}),
          };
    if (!(await trackingStore.create(record))) return { skip_reason: 'already_tracked' };

    const reason = 'untrackable' in resolved ? resolved.untrackable : undefined;
    telemetry?.reportAlertOutcome({
      transition: record.state === 'tracking' ? 'tracked' : 'untrackable',
      source: proposal.source,
      ...(reason ? { reason } : {}),
      ...(automationId ? { automation_id: automationId } : {}),
    });
    logger.info(
      `Alert outcome of investigation "${investigationId}": ${record.state}${
        reason ? ` (${reason})` : ''
      }, source=${proposal.source}${
        record.ref ? `, alert=${record.ref.alert_uuid} via ${record.ref.connector_id}` : ''
      }`
    );
    return {
      state: record.state as 'tracking' | 'untrackable',
      source: proposal.source,
      ...(reason ? { reason } : {}),
    };
  } catch (error) {
    logger.warn(
      `Could not track the alert outcome of investigation "${investigationId}": ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    return { skip_reason: 'failed' };
  }
};
