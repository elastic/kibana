/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Attachment } from '@kbn/agent-builder-common/attachments';
import type {
  AgentFormattedAttachment,
  AttachmentFormatContext,
  AttachmentTypeDefinition,
} from '@kbn/agent-builder-server/attachments';
import { z } from '@kbn/zod/v4';

import { ATTACK_DISCOVERY_VERDICT_ATTACHMENT_TYPE } from '../../../../common/constants';

/**
 * The FP/TP conclusion about one attack.
 *
 * Structured rather than a markdown blob: the verdict is an enum a reader can
 * branch on, and the bounds keep a single attachment from dominating the
 * conversation's context.
 */
export const attackDiscoveryVerdictAttachmentDataSchema = z.object({
  rationale_markdown: z.string().max(50_000).optional(),
  summary_markdown: z.string().max(8000),
  verdict: z.enum(['false_positive', 'true_positive', 'inconclusive', 'failed']),
});

export type AttackDiscoveryVerdictAttachmentData = z.infer<
  typeof attackDiscoveryVerdictAttachmentDataSchema
>;

const isAttackDiscoveryVerdictAttachmentData = (
  data: unknown
): data is AttackDiscoveryVerdictAttachmentData =>
  attackDiscoveryVerdictAttachmentDataSchema.safeParse(data).success;

const formatVerdict = (data: AttackDiscoveryVerdictAttachmentData): string =>
  [
    `# Analysis verdict: ${data.verdict}`,
    '',
    data.summary_markdown,
    ...(data.rationale_markdown != null ? ['', '## Rationale', data.rationale_markdown] : []),
  ].join('\n');

/**
 * Creates the server-side definition for the `security.attack_discovery.verdict`
 * attachment type.
 *
 * By value: the verdict is produced by the review that writes it and is persisted
 * nowhere else, so there is nothing to resolve an `origin` against. The markdown a
 * reader sees is rendered here from the fields rather than assembled by the
 * workflow, which is what keeps the verdict an enum instead of prose.
 */
export const createAttackDiscoveryVerdictAttachmentType = (): AttachmentTypeDefinition => ({
  id: ATTACK_DISCOVERY_VERDICT_ATTACHMENT_TYPE,

  // `format` above can emit 8k of summary plus 50k of rationale, and the framework
  // default is 10k, so without this a verdict would silently truncate for any agent
  // that reads the Investigation. Sized to this type's own schema rather than to
  // `security.alerts`'s 50k.
  maxContentLength: 60_000,

  validate: (input) => {
    const result = attackDiscoveryVerdictAttachmentDataSchema.safeParse(input);
    if (result.success) {
      return { valid: true, data: result.data };
    }
    return { valid: false, error: result.error.message };
  },

  format: (
    attachment: Attachment<string, unknown>,
    _context: AttachmentFormatContext
  ): AgentFormattedAttachment => ({
    getRepresentation: () => {
      if (!isAttackDiscoveryVerdictAttachmentData(attachment.data)) {
        throw new Error(
          `Invalid attack discovery verdict attachment data for attachment ${attachment.id}`
        );
      }
      return { type: 'text' as const, value: formatVerdict(attachment.data) };
    },
  }),

  // Describes what inline rendering LOOKS LIKE rather than when or why to use the
  // content: `render_inline` is the workflow's decision and belongs to the task, not
  // to the type. See the Agent Builder CONTRIBUTOR_GUIDE. The enum is named because it
  // describes the payload, not when to use it.
  getAgentDescription: () =>
    `Represents the false-positive / true-positive analysis verdict for an Attack Discovery. ` +
    `The verdict is one of: \`true_positive\` (the attack is real), \`false_positive\` (it ` +
    `is not), \`inconclusive\` (the evidence did not settle it), or \`failed\` (the analysis ` +
    `itself did not complete, so no classification was produced). Rendering this attachment ` +
    `inline displays the verdict as a labelled badge, followed by the summary it was drawn ` +
    `from and, when the analysis produced one, its rationale — both as formatted markdown in ` +
    `the conversation UI.`,
});
