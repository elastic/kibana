/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import type { IClusterClient, Logger } from '@kbn/core/server';
import type { Attachment } from '@kbn/agent-builder-common/attachments';
import { platformCoreTools } from '@kbn/agent-builder-common/tools';
import type {
  AttachmentResolveContext,
  AttachmentTypeDefinition,
} from '@kbn/agent-builder-server/attachments';
import { getTacticMetadata } from '@kbn/elastic-assistant-common';
import type { IRuleDataClient } from '@kbn/rule-registry-plugin/server';
import { z } from '@kbn/zod/v4';

import { ATTACK_DISCOVERY_ATTACHMENT_TYPE } from '../../../../common/constants';
import { transformSearchResponseToAlerts } from '../../../routes/post/validate/helpers/transform_search_response_to_alerts';
import { getPlainText } from './get_plain_text';
import { getResolveSearchRequest } from './get_resolve_search_request';

/**
 * Tools exposed to the agent while an Attack Discovery is attached. They match the
 * `security.alert` attachment, which Security Solution's "Add to chat" used before, so the agent
 * can still fetch entity risk, related discoveries, alerts, and cases on demand. The ids are
 * registered by Security Solution, which this plugin does not import.
 */
export const ATTACK_DISCOVERY_ATTACHMENT_TOOL_IDS = [
  'security.entity_risk_score',
  'security.attack_discovery_search',
  'security.security_labs_search',
  'security.alerts',
  platformCoreTools.cases,
  platformCoreTools.generateEsql,
  platformCoreTools.productDocumentation,
] as const;

const MAX_TITLE_LENGTH = 1024;
const MAX_SUMMARY_LENGTH = 8000;
const MAX_DETAILS_LENGTH = 50_000;
const MAX_ENTITY_SUMMARY_LENGTH = 8000;
const MAX_REPLACEMENTS = 1000;

/** Anonymized values are UUIDs, which keeps the replacements' keys, and their count, bounded. */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * The resolved content of an Attack Discovery attachment.
 *
 * Deliberately a projection of the persisted document rather than the whole of it:
 * this is what an analyst and the agent need to understand the attack, and the
 * bounds keep a single attachment from dominating the conversation's context.
 *
 * The title and markdown are the persisted, anonymized text. When `replacements` is present,
 * the attachment's view and the agent both insert the original values from it, one source.
 */
export const attackDiscoveryAttachmentDataSchema = z.object({
  // `format` lists each id on its own line, so an id may not contain whitespace, which would
  // let it add lines of its own to what the agent reads.
  alert_ids: z.array(z.string().max(512).regex(/^\S+$/)).max(1000),
  details_markdown: z.string().max(MAX_DETAILS_LENGTH),
  entity_summary_markdown: z.string().max(MAX_ENTITY_SUMMARY_LENGTH).optional(),
  id: z.string().max(512),
  mitre_attack_tactics: z.array(z.string().max(256)).max(64).optional(),
  replacements: z
    .record(z.string().regex(UUID), z.string().max(1024))
    .refine((replacements) => Object.keys(replacements).length <= MAX_REPLACEMENTS, {
      message: `Too many replacements; at most ${MAX_REPLACEMENTS} are allowed`,
    })
    .optional(),
  summary_markdown: z.string().max(MAX_SUMMARY_LENGTH),
  title: z.string().max(MAX_TITLE_LENGTH),
});

export type AttackDiscoveryAttachmentData = z.infer<typeof attackDiscoveryAttachmentDataSchema>;

const isAttackDiscoveryAttachmentData = (data: unknown): data is AttackDiscoveryAttachmentData =>
  attackDiscoveryAttachmentDataSchema.safeParse(data).success;

// The detected MITRE ATT&CK tactics, in kill-chain order, as a markdown section.
const getAttackChainLines = (mitreAttackTactics: string[] | undefined): string[] => {
  const detected = getTacticMetadata(mitreAttackTactics).filter((tactic) => tactic.detected);

  return detected.length > 0
    ? ['', '## Attack Chain', ...detected.map((tactic) => `- ${tactic.name}`)]
    : [];
};

// The stored markdown keeps the `{{ field value }}` syntax the UI draws as pills; the agent
// gets the plain values instead, with the original values from `replacements` inserted.
const formatAttackDiscovery = (data: AttackDiscoveryAttachmentData): string => {
  const { replacements } = data;
  const entitySummary =
    data.entity_summary_markdown != null
      ? getPlainText({
          markdown: data.entity_summary_markdown,
          maxLength: MAX_ENTITY_SUMMARY_LENGTH,
          replacements,
        })
      : '';

  return [
    `# ${getPlainText({ markdown: data.title, maxLength: MAX_TITLE_LENGTH, replacements })}`,
    '',
    `Attack Discovery id: ${data.id}`,
    `Correlated detection alerts: ${data.alert_ids.length}`,
    // Every id, so the agent can fetch the alerts with the `security.alerts` tool.
    ...data.alert_ids.map((alertId) => `- ${alertId}`),
    ...(entitySummary.length > 0 ? ['', '## Entity Summary', entitySummary] : []),
    '',
    '## Summary',
    getPlainText({ markdown: data.summary_markdown, maxLength: MAX_SUMMARY_LENGTH, replacements }),
    '',
    '## Details',
    getPlainText({ markdown: data.details_markdown, maxLength: MAX_DETAILS_LENGTH, replacements }),
    ...getAttackChainLines(data.mitre_attack_tactics),
  ].join('\n');
};

/**
 * Creates the server-side definition for the `security.attack_discovery` attachment type.
 *
 * Added two ways:
 * - By reference: the Attack Discovery review workflow adds it with an `origin` and no
 *   `data`, and `resolve` reads the persisted document once at add time.
 * - By value: Security Solution's "Add to chat" sends the data it already holds, so `resolve`
 *   is not called.
 *
 * Both store the persisted, anonymized text. Only "Add to chat" also sends the discovery's
 * `replacements`, so its attachment shows the original values to the analyst and the agent.
 */
export const createAttackDiscoveryAttachmentType = ({
  adhocAttackDiscoveryDataClient,
  esClient,
  logger,
}: {
  adhocAttackDiscoveryDataClient: IRuleDataClient;
  esClient: IClusterClient;
  logger: Logger;
}): AttachmentTypeDefinition => ({
  id: ATTACK_DISCOVERY_ATTACHMENT_TYPE,

  // The discovery is system-produced evidence, so the agent's attachment tools may read it
  // but not create or modify it. This also makes `attachment_read` return `format` output.
  // The review workflow's add step and "Add to chat" are not gated by it.
  isReadonly: true,

  // `format` above can emit a 1024-character title, up to 1000 alert ids, 8k of entity
  // summary, 8k of summary, 50k of details, and up to 64 tactics, and the framework default
  // is 10k, so without this the details a reader needs most would silently truncate. Sized
  // to this type's own schema rather than to `security.alerts`'s 50k.
  maxContentLength: 600_000,

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
    const { request, spaceId } = context;

    // As the current user, so the privileges of the identity adding the attachment apply;
    // later readers of the conversation see the stored snapshot. Scheduled and ad-hoc
    // discoveries share one document shape, so both indices are searched.
    const response = await esClient
      .asScoped(request)
      .asCurrentUser.search(
        getResolveSearchRequest({
          adhocIndex: adhocAttackDiscoveryDataClient.indexNameWithNamespace(spaceId),
          origin,
          spaceId,
        })
      )
      .catch((error: unknown) => {
        // The Elasticsearch error stays in the server log, not in the caller's error.
        const message = error instanceof Error ? error.message : String(error);
        logger.error(`Failed to read Attack Discovery with id "${origin}": ${message}`);
        throw new Error(`Failed to read Attack Discovery with id "${origin}"`);
      });

    const [discovery] = transformSearchResponseToAlerts({
      // Field rendering on, so the markdown keeps the `{{ field value }}` syntax the
      // renderer draws as pills. Replacements off: the markdown stays anonymized, as the
      // review workflow's inputs are.
      enableFieldRendering: true,
      logger,
      response: response as unknown as estypes.SearchResponse<Record<string, unknown>>,
      withReplacements: false,
    });

    // `ignore_unavailable` drops an index the current user cannot read, so a missing
    // privilege also ends here, with no hits.
    if (discovery == null) {
      logger.warn(`Failed to resolve attack discovery attachment for document id "${origin}"`);
      throw new Error(
        `Attack Discovery with id "${origin}" was not found, or is not readable by the current user`
      );
    }

    return {
      alert_ids: discovery.alert_ids,
      details_markdown: discovery.details_markdown,
      entity_summary_markdown: discovery.entity_summary_markdown,
      id: discovery.id,
      mitre_attack_tactics: discovery.mitre_attack_tactics,
      summary_markdown: discovery.summary_markdown,
      title: discovery.title,
    };
  },

  getTools: () => [...ATTACK_DISCOVERY_ATTACHMENT_TOOL_IDS],

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
