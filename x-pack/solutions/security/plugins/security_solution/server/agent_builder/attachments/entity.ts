/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z } from '@kbn/zod/v4';
import type { AttachmentTypeDefinition } from '@kbn/agent-builder-server/attachments';
import { SecurityAgentBuilderAttachments } from '../../../common/constants';
import { SECURITY_ENTITY_RISK_SCORE_TOOL_ID } from '../tools';
import { securityAttachmentDataSchema } from './security_attachment_data_schema';

/**
 * Maximum number of entities allowed in a single multi-entity attachment.
 * Keeps chat payloads bounded and caps the client-side fetch fan-out in the
 * rich renderer's multi-entity table.
 */
export const MAX_ENTITIES_PER_ATTACHMENT = 50;

const entityIdentifierSchema = z.object({
  identifierType: z.enum(['host', 'user', 'service', 'generic']),
  identifier: z.string().min(1),
  /**
   * Canonical `entity.id` value from the entity store (for example
   * `user:name@host@namespace`). When set, the rich-card lookup targets this
   * field directly instead of the per-type identity field, which is required
   * for local users where `entity.name` is a composite that does not match
   * `user.name`. Optional for backward compatibility with older payloads.
   */
  entityStoreId: z.string().min(1).optional(),
});

/**
 * Subset of `EntityRiskScoreRecord` that `security.get_entity` embeds on the
 * attachment payload so the chat card's `RiskSummaryMini` can render the
 * contributions table without a client-side round-trip to the risk index.
 *
 * The required fields mirror the client guard in
 * `public/agent_builder/attachment_types/entity_attachment/payload.ts`
 * (`isValidRiskStats`) so anything that passes this schema will also pass
 * the client validation. `.passthrough()` is used so we can evolve the
 * server-side stripper (see `stripRiskRecordForAttachment` in
 * `entity_attachment_utils.ts`) without also bumping this schema every
 * time a new optional field is introduced.
 *
 * IMPORTANT: Zod strips unknown keys by default. If the server-side tool
 * embeds new fields on the attachment, they must either be declared here
 * or the schema must keep `.passthrough()` — otherwise the
 * `AttachmentStateManager` validator silently drops them before the
 * payload is persisted and the client never sees them.
 */
const riskStatsPayloadSchema = z
  .object({
    '@timestamp': z.string().optional(),
    id_field: z.string().optional(),
    id_value: z.string().optional(),
    calculated_level: z.string(),
    calculated_score: z.number(),
    calculated_score_norm: z.number(),
    category_1_score: z.number(),
    category_1_count: z.number(),
    category_2_score: z.number().optional(),
    category_2_count: z.number().optional(),
    notes: z.array(z.unknown()).optional(),
    criticality_modifier: z.number().optional(),
    criticality_level: z.string().optional(),
    modifiers: z.array(z.unknown()).optional(),
    score_type: z.string().optional(),
  })
  .passthrough();

/**
 * Entity attachment payload. Two backward-compatible shapes are supported:
 *
 * 1. Single-entity (legacy): `{ identifierType, identifier, entityStoreId?,
 *    attachmentLabel?, riskStats?, resolutionRiskStats? }`. Rendered as a
 *    single card. The optional `riskStats`/`resolutionRiskStats` fields carry
 *    the risk breakdown fetched server-side from the risk time-series index.
 * 2. Multi-entity: `{ entities: [{ identifierType, identifier, entityStoreId? }, ...], attachmentLabel? }`.
 *    Rendered as a table. Capped at {@link MAX_ENTITIES_PER_ATTACHMENT}.
 *    Deliberately does not carry risk stats — the multi-entity renderer
 *    fetches its own summary per row from the entity store.
 */
const riskEntityAttachmentDataSchema = z.union([
  securityAttachmentDataSchema.extend({
    identifierType: z.enum(['host', 'user', 'service', 'generic']),
    identifier: z.string().min(1),
    entityStoreId: z.string().min(1).optional(),
    riskStats: riskStatsPayloadSchema.optional(),
    resolutionRiskStats: riskStatsPayloadSchema.optional(),
  }),
  securityAttachmentDataSchema.extend({
    entities: z.array(entityIdentifierSchema).min(1).max(MAX_ENTITIES_PER_ATTACHMENT),
  }),
]);

/**
 * Creates the definition for the `entity` attachment type.
 */
export const createEntityAttachmentType = (): AttachmentTypeDefinition => {
  return {
    id: SecurityAgentBuilderAttachments.entity,
    validate: (input) => {
      const parseResult = riskEntityAttachmentDataSchema.safeParse(input);
      if (parseResult.success) {
        return { valid: true, data: parseResult.data };
      } else {
        return { valid: false, error: parseResult.error.message };
      }
    },
    format: () => ({}),
    getTools: () => [SECURITY_ENTITY_RISK_SCORE_TOOL_ID],
    getAgentDescription: () => {
      return `You have access to one or more risk entities that need to be evaluated. Each entity has an identifierType and identifier that you should use to query the risk score.

## PAYLOAD SHAPES
The attachment data is one of two shapes:
- Single entity: top-level \`identifierType\` + \`identifier\` (+ optional \`attachmentLabel\`).
- Multi-entity: an \`entities\` array of \`{ identifierType, identifier }\` objects (+ optional \`attachmentLabel\`).
Handle both shapes.

## INLINE RENDERING (REQUIRED)
When a ${SecurityAgentBuilderAttachments.entity} attachment is present in the conversation, you MUST render it inline using the exact custom XML element shown below. The element name is literally \`render_attachment\` and the attribute names are literally \`id\` and \`version\` — do not rename, translate, or abbreviate them.

Assemble the tag by substituting \`ATTACHMENT_ID\` with the value of the attachment's \`attachment_id\` field from the conversation's attachment manifest, and \`VERSION\` with the value of the \`current_version\` field:

    <render_attachment id="ATTACHMENT_ID" version="VERSION" />

For example, given a manifest entry \`{ "attachment_id": "security.entity:user:a1b2…", "current_version": 3 }\`, the tag you emit is literally:

    <render_attachment id="security.entity:user:a1b2…" version="3" />

Rules:
- Copy \`attachment_id\` and \`current_version\` VERBATIM from the manifest. Never invent, guess, rewrite, or paraphrase them, and never construct an id from the entity name, email, or other fields.
- Put the \`<render_attachment>\` tag on its OWN LINE, with a blank line before and after it. Do not wrap it in backticks, quotes, code fences, or surrounding prose.
- Emit the \`<render_attachment>\` tag BEFORE your prose summary so the user sees the rich entity card or table first.
- Render each ${SecurityAgentBuilderAttachments.entity} attachment at most once per turn.
- Only omit the render tag if the user explicitly asks you not to show the entity card/table.

## ANALYSIS STEPS
1. Extract the \`identifierType\` and \`identifier\` (or list of them) from the attachment.
2. Use the available tools (e.g. risk score, asset criticality, entity store lookup) to gather context.
3. After emitting the \`<render_attachment>\` tag, provide a concise prose summary of the findings.`;
    },
  };
};
