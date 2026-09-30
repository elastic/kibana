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
import { TEMPLATE_ID_INVESTIGATION } from '@kbn/alertzero-common';
import {
  buildHuntInvestigationConversationId,
  buildHuntTriggerAttachmentId,
} from '../../services/watches/hunt/common/hunt_investigation_id';
import type { ReportHuntContext } from '../../services/watches/hunt/common/load_report_context';
import type {
  FindOrCreateInvestigationOutput,
  FindOrCreateInvestigationReportSummary,
} from '../../../common/step_types/find_or_create_investigation';

/**
 * Narrow slice of `ConversationPublicClient` this step needs (the client actually
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
  get: (conversationId: string) => Promise<unknown>;
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
        `hunt.findOrCreateInvestigation: could not read report ${reportId} for the trigger message: ${
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
    await conversationClient.get(investigationConversationId);
    created = false;
  }

  return {
    investigationConversationId,
    triggerAttachmentId,
    created,
    ...(report !== undefined ? { report } : {}),
  };
};
