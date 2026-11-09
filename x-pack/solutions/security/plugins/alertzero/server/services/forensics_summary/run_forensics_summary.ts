/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MetadataFieldValue, VersionedAttachment } from '@kbn/agent-builder-common';
import type { AttachmentPublicClient } from '@kbn/agent-builder-server/attachments';
import type { ElasticsearchClient, KibanaRequest, Logger } from '@kbn/core/server';
import { z, lazySchema } from '@kbn/zod/v4';
import type { RenderForensicsSummaryStepOutput } from '../../../common/step_types/render_forensics_summary';
import { FORENSICS_SUMMARY_TITLE, getForensicsAttachmentIds } from './constants';
import {
  findEndpointAnalysisIndicator,
  getAttachmentData,
  readAttackAlerts,
  readForensicsAttachments,
} from './read_forensics_inputs';
import { renderForensicsSummaryHtml } from './render_forensics_summary_html';
import type { ForensicsProposal } from './types';
import { buildForensicsSummaryViewModel, countOpenDecisions } from './view_model';
import type { ForensicsSummaryViewModel } from './view_model';

export interface ForensicsConversationReader {
  get(conversationId: string): Promise<{
    metadata?: Record<string, MetadataFieldValue>;
    attachments?: VersionedAttachment[];
  }>;
}

export type ForensicsAttachmentWriter = Pick<AttachmentPublicClient, 'create' | 'update'>;

export interface RunForensicsSummaryDeps {
  getConversationClient: (request: KibanaRequest) => Promise<ForensicsConversationReader>;
  getAttachmentsClient: (request: KibanaRequest) => Promise<ForensicsAttachmentWriter>;
  /** The Investigation's proposals, newest first, superseded revisions left out. */
  listProposals: (
    conversationId: string,
    spaceId: string,
    request: KibanaRequest
  ) => Promise<ForensicsProposal[]>;
  logger?: Logger;
}

const renderedCardSchema = lazySchema(() =>
  z.object({
    visualization: z.object({ template: z.string(), height: z.number().optional() }),
  })
);

const OPEN_DECISIONS = /(\d+) open decisions?/;

/** The card's description; it also records how many decisions were open, so a re-post can tell when they settle. */
export const describeForensicsSummary = (viewModel: ForensicsSummaryViewModel): string => {
  const open = countOpenDecisions(viewModel);
  return `${FORENSICS_SUMMARY_TITLE}: ${viewModel.title} · ${viewModel.verdict.replace(
    /_/g,
    ' '
  )} · ${open} open ${open === 1 ? 'decision' : 'decisions'}`;
};

const readOpenDecisions = (description: string | undefined): number => {
  const match = description?.match(OPEN_DECISIONS);
  return match ? Number(match[1]) : 0;
};

/**
 * Renders the forensics summary card for an Investigation whose Endpoint Analysis has finished, and adds it,
 * or writes a new version of it when what it shows changed. Interim updates are silent; once the last open
 * decision settles the card is posted in the chat again, since the chat shows an attachment as it was posted.
 */
export const runForensicsSummary = async ({
  request,
  spaceId,
  conversationId,
  esClient,
  abortSignal,
  deps,
}: {
  request: KibanaRequest;
  spaceId: string;
  conversationId: string;
  esClient: ElasticsearchClient;
  /** Aborted when a newer run for the Investigation cancels this one. */
  abortSignal?: AbortSignal;
  deps: RunForensicsSummaryDeps;
}): Promise<RenderForensicsSummaryStepOutput> => {
  const indicator = await findEndpointAnalysisIndicator({
    esClient,
    spaceId,
    conversationId,
    abortSignal,
  });
  if (!indicator) {
    return { skipped: true, reason: 'no_analysis' };
  }

  const conversationClient = await deps.getConversationClient(request);
  const [conversation, proposals] = await Promise.all([
    conversationClient.get(conversationId),
    deps.listProposals(conversationId, spaceId, request),
  ]);
  const attachments = conversation.attachments ?? [];
  const { timeline, iocs, attack } = readForensicsAttachments(attachments, indicator.kiId);
  const alerts = await readAttackAlerts({
    esClient,
    spaceId,
    alertIds: attack?.alertIds ?? [],
    abortSignal,
  });
  // A cancelled run read older state than the run that replaced it; writing now could overwrite a newer card.
  // The conversation and proposal reads take no signal, so this check is what keeps it from writing.
  if (abortSignal?.aborted) {
    return { skipped: true, reason: 'cancelled' };
  }
  const summary = conversation.metadata?.summary;

  const viewModel = buildForensicsSummaryViewModel({
    verdict: indicator.verdict,
    autonomy: indicator.autonomy,
    analyzedAt: indicator.analyzedAt,
    summary: typeof summary === 'string' ? summary : undefined,
    attack,
    timeline,
    iocs,
    proposals,
    alerts,
  });
  const { html, height } = renderForensicsSummaryHtml(viewModel);
  const description = describeForensicsSummary(viewModel);
  const attachmentId = getForensicsAttachmentIds(indicator.kiId).summary;
  const data = {
    renderer: 'custom_content',
    query: FORENSICS_SUMMARY_TITLE,
    visualization: { template: html, height, title: FORENSICS_SUMMARY_TITLE },
  };

  const existing = attachments.find(({ id }) => id === attachmentId);
  const attachmentsClient = await deps.getAttachmentsClient(request);
  if (!existing) {
    await attachmentsClient.create({
      conversationId,
      id: attachmentId,
      type: 'visualization',
      data,
      description,
      render_inline: true,
      access: 'converse',
    });
    deps.logger?.debug(`forensics summary: added ${attachmentId} to ${conversationId}`);
    return { skipped: false, attachment_id: attachmentId, action: 'created' };
  }

  const previous = renderedCardSchema.safeParse(getAttachmentData(attachments, attachmentId));
  if (
    previous.success &&
    previous.data.visualization.template === html &&
    previous.data.visualization.height === height &&
    existing.description === description
  ) {
    return { skipped: true, reason: 'unchanged', attachment_id: attachmentId };
  }

  const settled =
    readOpenDecisions(existing.description) > 0 && countOpenDecisions(viewModel) === 0;
  await attachmentsClient.update({
    conversationId,
    attachmentId,
    data,
    description,
    render_inline: settled,
    access: 'converse',
  });
  deps.logger?.debug(
    `forensics summary: updated ${attachmentId} on ${conversationId}${
      settled ? ' and re-posted it' : ''
    }`
  );
  return { skipped: false, attachment_id: attachmentId, action: 'updated' };
};
