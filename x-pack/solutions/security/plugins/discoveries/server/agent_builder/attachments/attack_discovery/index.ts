/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import type { Logger } from '@kbn/core/server';
import type { Attachment } from '@kbn/agent-builder-common/attachments';
import type {
  AttachmentResolveContext,
  AttachmentTypeDefinition,
} from '@kbn/agent-builder-server/attachments';
import type { IRuleDataClient } from '@kbn/rule-registry-plugin/server';
import { z } from '@kbn/zod/v4';

import { ATTACK_DISCOVERY_ATTACHMENT_TYPE } from '../../../../common/constants';
import { getIdsQuery } from '../../../routes/post/validate/helpers/get_ids_query';
import { transformSearchResponseToAlerts } from '../../../routes/post/validate/helpers/transform_search_response_to_alerts';

/**
 * The resolved content of an Attack Discovery attachment.
 *
 * Deliberately a projection of the persisted document rather than the whole of it:
 * this is what an analyst and the agent need to understand the attack, and the
 * bounds keep a single attachment from dominating the conversation's context.
 */
export const attackDiscoveryAttachmentDataSchema = z.object({
  alert_ids: z.array(z.string().max(512)).max(1000),
  details_markdown: z.string().max(50_000),
  id: z.string().max(512),
  summary_markdown: z.string().max(8000),
  title: z.string().max(1024),
});

export type AttackDiscoveryAttachmentData = z.infer<typeof attackDiscoveryAttachmentDataSchema>;

const isAttackDiscoveryAttachmentData = (data: unknown): data is AttackDiscoveryAttachmentData =>
  attackDiscoveryAttachmentDataSchema.safeParse(data).success;

const formatAttackDiscovery = (data: AttackDiscoveryAttachmentData): string =>
  [
    `# ${data.title}`,
    '',
    `Attack Discovery id: ${data.id}`,
    `Correlated detection alerts: ${data.alert_ids.length}`,
    '',
    '## Summary',
    data.summary_markdown,
    '',
    '## Details',
    data.details_markdown,
  ].join('\n');

/**
 * Creates the server-side definition for the `security.attack_discovery` attachment type.
 *
 * By-reference only in practice: the Attack Discovery review workflow adds it with an
 * `origin` and no `data`, and `resolve` reads the persisted document once at add time.
 * `validate` still accepts by-value data because the framework validates whatever
 * `resolve` returns.
 */
export const createAttackDiscoveryAttachmentType = ({
  adhocAttackDiscoveryDataClient,
  logger,
}: {
  adhocAttackDiscoveryDataClient: IRuleDataClient;
  logger: Logger;
}): AttachmentTypeDefinition => ({
  id: ATTACK_DISCOVERY_ATTACHMENT_TYPE,

  // `format` above can emit a 1024-character title plus 8k of summary and 50k of
  // details, and the framework default is 10k, so without this the details a reader
  // needs most would silently truncate. Sized to this type's own schema rather than
  // to `security.alerts`'s 50k.
  maxContentLength: 60_000,

  validate: (input) => {
    const result = attackDiscoveryAttachmentDataSchema.safeParse(input);
    if (result.success) {
      return { valid: true, data: result.data };
    }
    return { valid: false, error: result.error.message };
  },

  format: (attachment: Attachment<string, unknown>) => ({
    getRepresentation: () => {
      if (!isAttackDiscoveryAttachmentData(attachment.data)) {
        throw new Error(`Invalid attack discovery attachment data for attachment ${attachment.id}`);
      }
      return { type: 'text' as const, value: formatAttackDiscovery(attachment.data) };
    },
  }),

  // `origin` is the persisted Attack Discovery document id, which equals
  // `kibana.alert.uuid`. The run step's optional `id` is the LLM UUID and will not
  // resolve here.
  resolve: async (origin: string, context: AttachmentResolveContext) => {
    const response = await adhocAttackDiscoveryDataClient
      .getReader({ namespace: context.spaceId })
      .search({ size: 1, ...getIdsQuery([origin]) });

    const [discovery] = transformSearchResponseToAlerts({
      // Field rendering on, replacements off: the attachment carries the raw
      // discovery, and the Investigation is space-scoped rather than per-analyst,
      // so anonymized values would hide data every reader is entitled to see.
      enableFieldRendering: true,
      logger,
      response: response as unknown as estypes.SearchResponse<Record<string, unknown>>,
      withReplacements: false,
    });

    if (discovery == null) {
      logger.warn(`Failed to resolve attack discovery attachment for document id "${origin}"`);
      throw new Error(`Attack Discovery with id "${origin}" was not found`);
    }

    return {
      alert_ids: discovery.alert_ids,
      details_markdown: discovery.details_markdown,
      id: discovery.id,
      summary_markdown: discovery.summary_markdown,
      title: discovery.title,
    };
  },

  // Describes what inline rendering LOOKS LIKE rather than when or why to use the
  // content: `render_inline` is the workflow's decision and belongs to the task, not
  // to the type. See the Agent Builder CONTRIBUTOR_GUIDE.
  getAgentDescription: () =>
    `Represents an Attack Discovery: a correlated set of detection alerts that Attack ` +
    `Discovery identified as a single attack. Rendering this attachment inline displays the ` +
    `attack's title, then its summary and its detailed narrative as formatted markdown in ` +
    `the conversation UI, with the referenced detection alert fields rendered as interactive ` +
    `pills the user can open.`,
});
