/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { platformSignificantEventsTools, ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import {
  getAgentFromRunContext,
  type BuiltinToolDefinition,
  type StaticToolRegistration,
} from '@kbn/agent-builder-server';
import type { Logger } from '@kbn/core/server';
import { i18n } from '@kbn/i18n';
import {
  signalInputEntrySchema,
  significantEventSchema,
  MAX_ARRAY_LENGTH,
  UNCONFIRMED_EVENT_MAX_CONFIDENCE,
} from '@kbn/significant-events-schema';
import { nightshiftSourceSlugsField } from '@kbn/nightshift-shared';
import { z, lazySchema } from '@kbn/zod/v4';
import dedent from 'dedent';
import type { SignificantEventsServer } from '../../../types';
import type { GetScopedClients } from '../../../routes/types';
import type { EbtTelemetryClient } from '../../../lib/telemetry/ebt';
import type { KnowledgeIndicatorClient } from '../../../lib/knowledge_indicators';
import { assertSignificantEventsAccess } from '../../../routes/utils/assert_significant_events_access';
import { assertCanManageSignificantEvents } from '../../../routes/utils/assert_can_manage_significant_events';
import { createSignificantEventsAvailability } from '../significant_events_availability';
import {
  BulkWriteError,
  createBulkWriteValidationError,
  getBulkWriteToolErrorCode,
  MAX_BULK_WRITE_ITEMS,
  trackTelemetryBestEffort,
} from '../bulk_write';
import { SIGNIFICANT_EVENTS_DISCOVERY_AGENT_ID } from '../../agents/discovery/discovery';
import { eventsWriteBulkHandler, type EventsWriteInput } from './handler';
import { loadSourceCatalog, toSourceRef } from '../../utils/resolve_source_slugs';
import { assignStoredSourceIds } from '../../utils/stored_source_fields';
import { fillDetectionMetadata } from './detection_metadata';
import { hasConfirmingSignal } from './event_facts';

export const SIGNIFICANT_EVENTS_EVENTS_WRITE_TOOL_ID = platformSignificantEventsTools.eventsWrite;

export const eventsWriteItemSchema = lazySchema(() =>
  significantEventSchema
    .pick({
      event_id: true,
      title: true,
      symptom_hypothesis: true,
      summary: true,
      severity: true,
      confidence: true,
      assessment_note: true,
      signals: true,
      causal_features: true,
      blast_radius: true,
      workflow_execution_id: true,
      conversation_id: true,
    })
    .extend({
      signals: z
        .array(signalInputEntrySchema)
        .max(MAX_ARRAY_LENGTH)
        .optional()
        .describe(
          'Evidence signals associated with this incident record. Each entry represents one alerting rule associated with this event. '
        ),
      slugs: nightshiftSourceSlugsField(
        'This event covers these sources. Nested signal, causal feature, and blast radius `source_id` values are slugs too. Disabled sources are accepted.'
      ),
      // Rejected (not stripped), so a stale caller trying to close an event fails loudly instead of
      // having its item written `active`.
      status: z
        .never({
          error:
            'status is not an input: it follows from the per-rule verdicts you write. A breach opens or keeps an event active, healthy verdicts for every member of an active event move it to recovering, and only an operator or a close workflow closes a live event. An event is never born from healthy evidence.',
        })
        .optional(),
      event_id: z
        .string()
        .optional()
        .transform((v) => (v === '' ? undefined : v))
        .describe(
          dedent`
          ID of an existing event to append a new version to (continuation/snapshot mode).
          Never compose, shorten or guess an event_id. For Discovery, copy it
          character-for-character from an active event returned by event_search in this run. The
          Discovery handler rejects unknown IDs.

          Omit to trigger find-or-create. When the item has confirmed rules, the handler scans
          all currently-active events for one that confirms every submitted confirmed rule and
          shares at least one source; non-confirming co-signals do not affect the identity.
          When the item has no confirmed rules, every submitted rule is used instead. If found,
          the write is skipped and the existing event_id is returned (written: false,
          reason: existing_active_event). Otherwise a new event is created with a generated
          event_id.
        `
        ),
    })
    .partial({ event_id: true })
    .superRefine((item, ctx) => {
      const signals = item.signals ?? [];
      const hasConfirms = signals.some((s) => s.evidence != null && s.verdict === 'confirms');

      // One issue per offending signal, so a retry knows exactly which entries to remove.
      if (hasConfirms) {
        signals.forEach((signal, index) => {
          if (signal.verdict !== 'not_checked') return;
          const ruleUuid = signal.metadata?.rule_uuid ?? 'unknown';
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['signals', index],
            message: `A confirms item cannot include not_checked signals; remove the signal of rule ${ruleUuid} from this item, leave that detection out of the write, and add its rule_uuid to written_rule_uuids.`,
          });
        });
      }
      // An event is born only from evidence that points to an error: a confirming signal, an
      // off-topic row, or an inconclusive result that found rows. Healthy, empty, errored or
      // unchecked evidence is not an event; it can only join a live one. When nothing on the event
      // confirms, it is rated low with little confidence; the writer enforces that too, but refusing
      // it here lets the note state the confidence that is stored.
      const pointsToError = (signal: (typeof signals)[number]): boolean =>
        signal.verdict === 'confirms' ||
        signal.verdict === 'off_topic' ||
        (signal.verdict === 'inconclusive' && signal.evidence?.result === 'found');
      if (signals.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `A ${
            item.event_id === undefined ? 'new event' : 'continuation'
          } must carry at least one signal.`,
        });
      } else if (item.event_id === undefined) {
        if (!signals.some(pointsToError)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['signals'],
            message:
              'A new event needs evidence that points to an error: a confirms signal, an off_topic row with a concrete error, or an inconclusive result with found rows. Leave these detections out of the write and add their rule_uuid to written_rule_uuids.',
          });
        } else if (!hasConfirmingSignal(signals)) {
          if (item.severity !== undefined && item.severity !== 'low') {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ['severity'],
              message:
                'No signal in this new event confirms anything, so its severity must be low.',
            });
          }
          if (item.confidence !== undefined && item.confidence > UNCONFIRMED_EVENT_MAX_CONFIDENCE) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ['confidence'],
              message: `No signal in this new event confirms anything, so its confidence is at most ${UNCONFIRMED_EVENT_MAX_CONFIDENCE}.`,
            });
          }
        }
      }
    })
);

const ITEMS_REQUIRED_MESSAGE = 'Pass items as a non-empty array of event objects.';

const eventsWriteItemsSchema = lazySchema(() =>
  z
    .array(eventsWriteItemSchema, { error: ITEMS_REQUIRED_MESSAGE })
    .min(1, { error: ITEMS_REQUIRED_MESSAGE })
    .max(MAX_BULK_WRITE_ITEMS)
    .refine(
      (items) => {
        const ruleUuids = items.flatMap((item) =>
          (item.signals ?? [])
            .filter((signal) => signal.type === 'detection')
            .map((signal) => signal.metadata?.rule_uuid)
            .filter((ruleUuid): ruleUuid is string => Boolean(ruleUuid))
        );
        return new Set(ruleUuids).size === ruleUuids.length;
      },
      {
        message:
          'Each detection rule UUID may appear exactly once in the complete write, including within a single event item. Correct ownership before the single write; never retry with an empty placeholder.',
      }
    )
    .describe(
      i18n.translate('xpack.significantEvents.agentBuilder.tools.eventsWrite.schema.items', {
        defaultMessage:
          'Non-empty array of event objects. One call assigns every batch detection. Omit event_id only for new events; supply the accepted existing event_id for every continuation. Each detection rule_uuid may appear exactly once in the complete request, including within an item. A confirms item must not include not_checked signals. A new event must carry a confirms signal (or an off_topic signal with an observed error); a continuation may carry any verdict, including refutes for a rule that turned healthy. Status is not an input: it follows from the verdicts.',
      })
    )
);

export const eventsWriteSchema = lazySchema(() =>
  z
    .object({
      source: z
        .literal('discovery')
        .optional()
        .describe(
          'Identifies the caller of this write. Discovery calls must set this to "discovery".'
        ),
      items: eventsWriteItemsSchema,
    })
    .describe(
      i18n.translate('xpack.significantEvents.agentBuilder.tools.eventsWrite.schema', {
        defaultMessage: 'Bulk-write a batch of significant events.',
      })
    )
);

export type EventsWriteParams = z.infer<typeof eventsWriteSchema>;

const enrichCausalFeatures = async (
  items: EventsWriteInput[],
  getKnowledgeIndicatorClient: () => Promise<KnowledgeIndicatorClient>,
  logger: Logger
): Promise<EventsWriteInput[]> => {
  const causalFeatures = items.flatMap(({ causal_features: features = [] }) => features);
  const blastRadiusEntries = items.flatMap(({ blast_radius: entries = [] }) => entries);
  if (causalFeatures.length === 0 && blastRadiusEntries.length === 0) {
    return items;
  }

  try {
    // Stored docs keep the derived uuid in their root `id`, so `id` matches uuid-style
    // references and `featureIds` (feature.slug) matches slug-style ones.
    const references = [...causalFeatures, ...blastRadiusEntries];
    const featureIds = [...new Set(references.map(({ feature_id: featureId }) => featureId))];
    const sourceIds = [
      ...new Set([
        ...items.flatMap(({ source_ids: ids }) => ids),
        ...references.flatMap(({ source_id: sourceId }) => sourceId ?? []),
      ]),
    ];
    const kiClient = await getKnowledgeIndicatorClient();
    const hits = (
      await Promise.all([
        kiClient.getFeatures(sourceIds, {
          featureIds,
          includeExcluded: true,
          includeExpired: true,
        }),
        kiClient.getFeatures(sourceIds, {
          id: featureIds,
          includeExcluded: true,
          includeExpired: true,
        }),
      ])
    ).flatMap(({ hits: featureHits }) => featureHits);
    // Both lookups can return the same indicator; keep one entry per uuid.
    const uniqueHits = [...new Map(hits.map((feature) => [feature.uuid, feature])).values()];
    const featuresByReference = new Map(
      uniqueHits.flatMap((feature) => [
        [`${feature.source_id}:${feature.id}`, feature] as const,
        [`${feature.source_id}:${feature.uuid}`, feature] as const,
      ])
    );

    const resolveFeature = (
      featureId: string,
      explicitSourceId: string | undefined,
      itemSourceIds: string[]
    ) => {
      if (explicitSourceId !== undefined) {
        const explicit = featuresByReference.get(`${explicitSourceId}:${featureId}`);
        if (explicit) return explicit;
      }
      // Without an explicit source, or when it names a source that does not hold the id (a
      // duplicate source the agent copied from): an unambiguous match wins; otherwise restrict to
      // the event's own sources so a shared slug on another source cannot stamp the wrong
      // classification.
      const matches = uniqueHits.filter(({ id, uuid }) => id === featureId || uuid === featureId);
      const scoped = matches.filter(({ source_id: sourceId }) => itemSourceIds.includes(sourceId));
      return (scoped.length === 1 ? scoped : matches.length === 1 ? matches : [])[0];
    };

    // A feature_id that names no Knowledge Indicator of a source that has some cannot be matched by
    // a later topology search, so it is refused rather than written.
    const unresolved = [
      ...new Set(
        items.flatMap((item) =>
          [...(item.causal_features ?? []), ...(item.blast_radius ?? [])].flatMap((reference) =>
            resolveFeature(reference.feature_id, reference.source_id, item.source_ids)
              ? []
              : [reference.feature_id]
          )
        )
      ),
    ];
    if (unresolved.length > 0) {
      const { hits: anyFeature } = await kiClient.getFeatures(sourceIds, {
        limit: 1,
        includeExcluded: true,
        includeExpired: true,
      });
      if (anyFeature.length > 0) {
        throw createBulkWriteValidationError(
          `feature_id ${unresolved
            .map((id) => JSON.stringify(id))
            .join(
              ', '
            )} is not a Knowledge Indicator id. Copy each feature_id exactly as ki_search returned it (no prefix, no change of case), or leave that node out.`
        );
      }
    }

    return items.map((item) => ({
      ...item,
      causal_features: item.causal_features?.map((causalFeature) => {
        const feature = resolveFeature(
          causalFeature.feature_id,
          causalFeature.source_id,
          item.source_ids
        );
        return feature
          ? {
              ...causalFeature,
              feature_id: feature.id,
              type: feature.type,
              subtype: feature.subtype,
            }
          : causalFeature;
      }),
      // Blast radius rows carry their own row-shape discriminator in `type`; only the
      // indicator's subtype is enriched.
      blast_radius: item.blast_radius?.map((entry) => {
        const feature = resolveFeature(entry.feature_id, entry.source_id, item.source_ids);
        return feature
          ? {
              ...entry,
              feature_id: feature.id,
              subtype: feature.subtype,
            }
          : entry;
      }),
    }));
  } catch (error) {
    if (error instanceof BulkWriteError) throw error;
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.warn(`Failed to enrich causal features; writing them unenriched: ${message}`);
    return items;
  }
};

export function createEventsWriteTool({
  getScopedClients,
  server,
  logger,
  telemetry,
}: {
  getScopedClients: GetScopedClients;
  server: SignificantEventsServer;
  logger: Logger;
  telemetry: EbtTelemetryClient;
}): StaticToolRegistration<typeof eventsWriteSchema> {
  const toolDefinition: BuiltinToolDefinition<typeof eventsWriteSchema> = {
    id: SIGNIFICANT_EVENTS_EVENTS_WRITE_TOOL_ID,
    type: ToolType.builtin,
    description: dedent`
       Write a batch of significant events. Always pass the completed object
      \`{ "items": [ ... ] }\` with at least one event item. Never pass \`{}\` or
      \`{ "items": [] }\`. If that missing-items argument error occurs, submit the
      already-completed object once. Do not retry a populated payload rejected for
      ownership or field validation. If a completed item returns \`unknown_event_id\`,
      do not retry that item in this run. Do not rerun routing, choose another event, reuse the
      rejected ID, or omit the ID to turn it into a new event. Discovery must leave its rules
      unprocessed so the next cycle routes them again from fresh search results.

      Discovery calls must set top-level \`source\` to \`"discovery"\`.

      **With event_id**: append a version to an existing event. Its status follows the merged
      members' verdicts: a breaching member returns a recovering event to active, while healthy or
      unjudgeable verdicts keep it recovering. Submit healthy evidence for a member too. A new event
      is born only from evidence that points to an error (a confirms signal, an off_topic row, or
      an inconclusive result with found rows); healthy or empty evidence is not written.
      Signals and topology are merged with prior versions. \`severity\` is your verdict under
      its field contract, decided from the merged confirming signals; the writer stores it as given
      (an inactive event is low) and returns the stored tier. No-op if the stored severity and
      status are unchanged (written: false, reason: unchanged_outcome). For Discovery writes, a
      completed investigation makes the stored severity authoritative over the newly proposed
      one. It is preserved unless Discovery reactivates an inactive event or submits a confirmed
      rule UUID absent from the current event. When no new rule UUIDs are introduced, title and
      symptom_hypothesis are frozen to the stored values and narrative_preserved: true is returned.

      **Without event_id**: find-or-create. When the item has confirmed rules, scans all
      currently-active events for one that confirms every submitted confirmed rule and shares at
      least one source; non-confirming co-signals do not affect the identity. When the item
      has no confirmed rules, every submitted rule is used instead. If found, returns it without
      writing (written: false, reason: existing_active_event). Otherwise creates a new event with
      a generated event_id.
    `,
    annotations: {
      title: 'Write significant events',
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: false,
    },
    schema: eventsWriteSchema,
    tags: ['streams', 'significant-events'],
    availability: createSignificantEventsAvailability({ server, logger }),
    handler: async (toolParams, context) => {
      const { request } = context;
      let storedItems: EventsWriteInput[] | undefined;
      try {
        const {
          getEventSearchClient,
          getDetectionClient,
          getKnowledgeIndicatorClient,
          licensing,
          sourcesClient,
        } = await getScopedClients({
          request,
        });
        await assertSignificantEventsAccess({ server, licensing });
        await assertCanManageSignificantEvents({ request, server });
        const catalog = await loadSourceCatalog(sourcesClient);
        const detectionClient = await getDetectionClient();
        const identifiedItems = await fillDetectionMetadata({
          items: toolParams.items,
          findDetections: (detectionIds) => detectionClient.findByIds(detectionIds),
        });
        const resolvedItems = identifiedItems.map((item) => assignStoredSourceIds(catalog, item));
        storedItems = resolvedItems;
        const items = await enrichCausalFeatures(
          resolvedItems,
          getKnowledgeIndicatorClient,
          logger
        );

        const data = await eventsWriteBulkHandler({
          eventSearchClient: await getEventSearchClient(),
          inputs: items,
          source: toolParams.source,
          rejectUnknownEventIds:
            getAgentFromRunContext(context.runContext)?.agentId ===
            SIGNIFICANT_EVENTS_DISCOVERY_AGENT_ID,
          logger,
        });

        data.forEach((result) => {
          const input = resolvedItems[result.index];
          if (input === undefined) return;
          const isSkipped = !result.written && 'skipped' in result;
          const isBulkError = !result.written && 'error' in result;
          trackTelemetryBestEffort({
            logger,
            description: 'events_write telemetry',
            track: () =>
              telemetry.trackAgentToolEventsWrite({
                success: result.written || isSkipped,
                event_id: result.event_id ?? 'unknown',
                status: result.status,
                written: result.written,
                source_ids: input.source_ids,
                error_message: isBulkError ? result.error.reason : undefined,
                ...(result.written ? { severity: result.severity } : {}),
              }),
          });
        });

        return {
          results: [
            {
              type: ToolResultType.other,
              data: {
                results: data.map((result) => {
                  const input = resolvedItems[result.index];
                  if (!input) {
                    return result;
                  }
                  return {
                    ...result,
                    sources: input.source_ids.flatMap((sourceId) => {
                      const source = catalog.byId.get(sourceId);
                      return source ? [toSourceRef(source)] : [];
                    }),
                  };
                }),
              },
            },
          ],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        logger.error(`Error running events_write: ${message}`);
        // Source ids exist only once the slugs resolved; earlier failures report none.
        (storedItems ?? toolParams.items).forEach((input) => {
          trackTelemetryBestEffort({
            logger,
            description: 'failed events_write telemetry',
            track: () =>
              telemetry.trackAgentToolEventsWrite({
                success: false,
                event_id: input.event_id ?? 'unknown',
                written: false,
                source_ids: 'source_ids' in input ? input.source_ids : [],
                error_message: message,
              }),
          });
        });
        const code = getBulkWriteToolErrorCode(error instanceof Error ? error : new Error(message));
        return {
          results: [
            {
              type: ToolResultType.error,
              data: {
                code,
                retryable: false,
                message: i18n.translate(
                  'xpack.significantEvents.agentBuilder.tools.eventsWrite.errorMessage',
                  {
                    defaultMessage: 'Failed to write significant event: {message}',
                    values: { message },
                  }
                ),
              },
            },
          ],
        };
      }
    },
  };

  return toolDefinition;
}
