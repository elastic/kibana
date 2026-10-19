/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import {
  agentBuilderDefaultAgentId,
  ConversationAccessControlMode,
  isConversationAlreadyExistsError,
} from '@kbn/agent-builder-common';
import type { MetadataFieldValue } from '@kbn/agent-builder-common';
import { TEMPLATE_ID_INVESTIGATION } from '@kbn/alertzero-common';
import type { FindOrCreateInvestigationResponse } from '@kbn/alertzero-common';
import {
  buildHuntInvestigationConversationId,
  buildHuntTriggerAttachmentId,
} from './hunt_investigation_id';
import type { ReportHuntContext } from './load_report_context';

export type FindOrCreateInvestigationOutput = FindOrCreateInvestigationResponse;
export type FindOrCreateInvestigationReportSummary = NonNullable<
  FindOrCreateInvestigationResponse['report']
>;

/**
 * Narrow slice of `ConversationPublicClient` this needs (the client actually
 * injected at the call site is the public, camelCase wrapper, not the internal
 * snake_case `ConversationClient`), kept separate from the real type so the
 * business logic below is testable without mocking the full client.
 */
export interface FindOrCreateConversationClient {
  create: (request: {
    id: string;
    agentId: string;
    title: string;
    templateId: string;
    accessControl: { access_mode: ConversationAccessControlMode; entries: never[] };
  }) => Promise<unknown>;
  get: (conversationId: string) => Promise<{ metadata?: Record<string, MetadataFieldValue> }>;
  patchMetadata: (
    conversationId: string,
    updates: Record<string, MetadataFieldValue>,
    options?: { access?: 'owner' | 'converse' }
  ) => Promise<unknown>;
}

export interface RunFindOrCreateInvestigationDeps {
  conversationClient: FindOrCreateConversationClient;
  /**
   * Reads the report so the trigger message can describe what is being hunted.
   * Optional and best-effort: a read failure or a missing report leaves
   * `report` undefined and never fails the find-or-create itself.
   */
  loadReport?: () => Promise<ReportHuntContext | null>;
  logger?: Logger;
}

const MAX_SUMMARY_TECHNIQUES = 100;

/**
 * Reopens an Investigation a previous run closed, so a new run records into active work.
 *
 * The Investigation id is derived from the report, so every run on the same report resolves
 * to the same conversation -- including one that packaging closed as `benign` after a clean
 * hunt, or that the proposal gate closed as `resolved` once every proposal settled. Nothing
 * else reopens it, so without this a later confirmed hit and its proposals would attach to a
 * conversation an analyst sees as finished.
 *
 * Only `status` is reset. `close_reason` is a SELECT over
 * `false_positive | benign | resolved | duplicate | other`, so there is no value meaning "not
 * closed" to write back, and an empty string fails template validation -- a reopened
 * Investigation therefore keeps the reason the last run closed it. The platform treats that
 * pairing as wrong (`escalations_service` deliberately excludes `close_reason` when seeding an
 * open escalation) but only has the option of omitting the field, which a merge-patch cannot do.
 *
 * `converse` access rather than the default `owner`: the Investigation is created public
 * precisely so it belongs to whoever is on duty rather than to the identity that minted it, and
 * a manual rerun is run by an analyst who typically does not own it.
 */
const reopenIfClosed = async (
  conversationClient: FindOrCreateConversationClient,
  investigationConversationId: string,
  metadata: Record<string, MetadataFieldValue> | undefined
): Promise<boolean> => {
  // Absent or empty reads as open in the investigation template, so there is nothing to reopen.
  if (metadata?.status !== 'closed') {
    return false;
  }
  await conversationClient.patchMetadata(
    investigationConversationId,
    { status: 'open' },
    { access: 'converse' }
  );
  return true;
};

export const summarizeReportForTrigger = (
  context: ReportHuntContext
): FindOrCreateInvestigationReportSummary => ({
  ...(context.title !== undefined ? { title: context.title } : {}),
  ...(context.source_name !== undefined ? { sourceName: context.source_name } : {}),
  ...(context.published_at !== undefined ? { publishedAt: context.published_at } : {}),
  ...(context.severity !== undefined ? { severity: context.severity } : {}),
  iocCount: context.iocs.length,
  techniques: context.techniques.slice(0, MAX_SUMMARY_TECHNIQUES),
});

/**
 * Mints the deterministic Investigation id for a report and creates the conversation.
 * A verified 409 (the Investigation already exists for this subject key) is success:
 * the existing conversation is read back to confirm it is reachable before the
 * conflict is treated as success, rather than trusting the create-time race
 * alone. `created` tells the caller which path ran,
 * so a rerun's trigger message can say so instead of claiming to have opened the
 * Investigation again.
 */
export const runFindOrCreateInvestigation = async (
  { spaceId, reportId }: { spaceId: string; reportId: string },
  { conversationClient, loadReport, logger }: RunFindOrCreateInvestigationDeps
): Promise<FindOrCreateInvestigationOutput> => {
  const investigationConversationId = buildHuntInvestigationConversationId(reportId);
  const triggerAttachmentId = buildHuntTriggerAttachmentId({ spaceId, reportId });

  let report: FindOrCreateInvestigationReportSummary | undefined;
  if (loadReport) {
    try {
      const context = await loadReport();
      if (context) report = summarizeReportForTrigger(context);
    } catch (error) {
      logger?.warn(
        `findOrCreateInvestigation: could not read report ${reportId} for the trigger message: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  let created = true;
  try {
    await conversationClient.create({
      id: investigationConversationId,
      agentId: agentBuilderDefaultAgentId,
      title: report?.title ?? reportId,
      templateId: TEMPLATE_ID_INVESTIGATION,
      // A Worker-minted Investigation belongs to whichever analyst is on duty, not to the
      // identity the workflow happened to execute as; the client default is private.
      accessControl: { access_mode: ConversationAccessControlMode.Public, entries: [] },
    });
  } catch (error) {
    if (!isConversationAlreadyExistsError(error)) {
      throw error;
    }
    const existing = await conversationClient.get(investigationConversationId);
    created = false;
    // Deliberately not swallowed. Without an Investigation id the Worker skips the coordinator
    // entirely, so a failure here writes no evidence and leaves the report eligible for the next
    // sweep -- a retry. Continuing instead would hunt into a conversation this run knows is
    // closed and file its findings where nobody is looking, which is the worse of the two.
    if (await reopenIfClosed(conversationClient, investigationConversationId, existing.metadata)) {
      logger?.debug(
        `findOrCreateInvestigation: reopened Investigation ${investigationConversationId} for report ${reportId}, which a previous run had closed.`
      );
    }
  }

  return {
    investigationConversationId,
    triggerAttachmentId,
    created,
    ...(report !== undefined ? { report } : {}),
  };
};
