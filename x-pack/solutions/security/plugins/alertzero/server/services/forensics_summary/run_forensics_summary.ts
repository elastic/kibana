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
import {
  FORENSICS_SUMMARY_TITLE,
  getForensicsSummaryCardGeneration,
  getForensicsSummaryCardId,
} from './constants';
import {
  findEndpointAnalysisIndicator,
  getAttachmentData,
  readAttackAlerts,
  readForensicsAttachments,
} from './read_forensics_inputs';
import { renderForensicsSummaryHtml } from './render_forensics_summary_html';
import type { ForensicsProposal } from './types';
import { buildForensicsSummaryViewModel } from './view_model';
import type { ForensicsSummaryViewModel } from './view_model';

export interface ForensicsConversationReader {
  get(conversationId: string): Promise<{
    metadata?: Record<string, MetadataFieldValue>;
    attachments?: VersionedAttachment[];
  }>;
}

export type ForensicsAttachmentWriter = Pick<AttachmentPublicClient, 'create' | 'delete'>;

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

/** The decision counts by state, as the description records them: `1 awaiting, 3 closed`, or `none`. */
const describeDecisions = ({ decisions }: ForensicsSummaryViewModel): string =>
  Object.entries(decisions)
    .filter(([, count]) => count > 0)
    .map(([group, count]) => `${count} ${group}`)
    .join(', ') || 'none';

/** The card's description; it also records the decision counts. */
export const describeForensicsSummary = (viewModel: ForensicsSummaryViewModel): string =>
  `${FORENSICS_SUMMARY_TITLE}: ${viewModel.title} · ${viewModel.verdict.replace(
    /_/g,
    ' '
  )} · decisions: ${describeDecisions(viewModel)}`;

/** The analysis's summary cards, oldest first, each with the generation it was posted as. */
const listSummaryCards = (attachments: readonly VersionedAttachment[], kiId: string) =>
  attachments
    .flatMap((attachment) => {
      const generation = getForensicsSummaryCardGeneration(kiId, attachment.id);
      return generation === undefined ? [] : [{ attachment, generation }];
    })
    .sort((a, b) => a.generation - b.generation);

/**
 * Renders the forensics summary card for an Investigation whose Endpoint Analysis has finished, and adds it,
 * or posts it again when what it shows changed.
 *
 * The chat draws a posted card at the version it was posted with, and an update can't change that. So when
 * anything the card shows changes (a new summary, proposals raised, decided or settled), the card is posted
 * again as a new attachment and the cards before it are deleted, which drops them from the chat: it shows
 * one card, the latest.
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
  const data = {
    renderer: 'custom_content',
    query: FORENSICS_SUMMARY_TITLE,
    visualization: { template: html, height, title: FORENSICS_SUMMARY_TITLE },
  };

  const cards = listSummaryCards(attachments, indicator.kiId);
  const activeCards = cards.filter(({ attachment }) => attachment.active !== false);
  const current = activeCards[activeCards.length - 1]?.attachment;
  const attachmentsClient = await deps.getAttachmentsClient(request);

  if (current) {
    const previous = renderedCardSchema.safeParse(getAttachmentData(attachments, current.id));
    const unchanged =
      previous.success &&
      previous.data.visualization.template === html &&
      previous.data.visualization.height === height &&
      current.description === description;
    if (unchanged) {
      return { skipped: true, reason: 'unchanged', attachment_id: current.id };
    }
  }

  // A deleted card keeps its generation, so a new one never reuses an id the chat already drew.
  const generation = (cards[cards.length - 1]?.generation ?? 0) + 1;
  const attachmentId = getForensicsSummaryCardId(indicator.kiId, generation);
  await attachmentsClient.create({
    conversationId,
    id: attachmentId,
    type: 'visualization',
    data,
    description,
    render_inline: true,
    access: 'converse',
  });
  // Every older card is deleted, not just the last, so one that a failed delete left behind goes on the next post.
  for (const { attachment } of activeCards) {
    try {
      await attachmentsClient.delete({ conversationId, attachmentId: attachment.id });
    } catch (error) {
      deps.logger?.warn(
        `forensics summary: could not delete the older card ${
          attachment.id
        } on ${conversationId}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
  deps.logger?.debug(`forensics summary: posted ${attachmentId} on ${conversationId}`);
  return {
    skipped: false,
    attachment_id: attachmentId,
    action: current ? 'reposted' : 'created',
  };
};
