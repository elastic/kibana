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
  MAX_ASSESSMENT_NOTE_LENGTH,
  MAX_SIGNAL_DESCRIPTION_LENGTH,
  MAX_SUMMARY_LENGTH,
  MAX_SYMPTOM_HYPOTHESIS_LENGTH,
  significantEventSchema,
} from '@kbn/significant-events-schema';
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
  getBulkWriteToolErrorCode,
  MAX_BULK_WRITE_ITEMS,
  trackTelemetryBestEffort,
} from '../bulk_write';
import { SIGNIFICANT_EVENTS_DISCOVERY_AGENT_ID } from '../../agents/discovery/discovery';
import { eventsWriteBulkHandler } from './handler';

export const SIGNIFICANT_EVENTS_EVENTS_WRITE_TOOL_ID = platformSignificantEventsTools.eventsWrite;

export const eventsWriteItemSchema = lazySchema(() =>
  significantEventSchema
    .pick({
      event_id: true,
      status: true,
      stream_names: true,
      title: true,
      symptom_hypothesis: true,
      summary: true,
      confidence: true,
      assessment_note: true,
      signals: true,
      causal_features: true,
      blast_radius: true,
      workflow_execution_id: true,
      conversation_id: true,
    })
    .extend({
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
          shares at least one stream name; non-confirming co-signals do not affect the identity.
          When the item has no confirmed rules, every submitted rule is used instead. If found,
          the write is skipped and the existing event_id is returned (written: false,
          reason: existing_active_event). Otherwise a new event is created with a generated
          event_id.
        `
        ),
    })
    .partial({ event_id: true })
    .refine(
      (item) =>
        (item.signals ?? []).every((s) => s.description.length <= MAX_SIGNAL_DESCRIPTION_LENGTH),
      {
        message: `Signal descriptions must be at most ${MAX_SIGNAL_DESCRIPTION_LENGTH} characters for agent input`,
      }
    )
    .refine(
      (item) =>
        item.symptom_hypothesis === undefined ||
        item.symptom_hypothesis.length <= MAX_SYMPTOM_HYPOTHESIS_LENGTH,
      {
        message: `Symptom hypotheses must be at most ${MAX_SYMPTOM_HYPOTHESIS_LENGTH} characters for agent input`,
      }
    )
    .refine((item) => item.summary.length <= MAX_SUMMARY_LENGTH, {
      message: `Summaries must be at most ${MAX_SUMMARY_LENGTH} characters for agent input`,
    })
    .refine(
      (item) =>
        item.assessment_note === undefined ||
        item.assessment_note.length <= MAX_ASSESSMENT_NOTE_LENGTH,
      {
        message: `Assessment notes must be at most ${MAX_ASSESSMENT_NOTE_LENGTH} characters for agent input`,
      }
    )
    .superRefine((item, ctx) => {
      const signals = item.signals ?? [];
      const hasConfirms = signals.some((s) => s.evidence != null && s.verdict === 'confirms');
      const hasNotChecked = signals.some((s) => s.verdict === 'not_checked');

      if (hasConfirms && hasNotChecked) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            'A confirms item cannot include not_checked signals; emit each not_checked detection as its own inactive item.',
        });
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
          'Non-empty array of event objects. One call assigns every batch detection. Omit event_id only for new events; supply the accepted existing event_id for every continuation. Each detection rule_uuid may appear exactly once in the complete request, including within an item. A confirms item must not include not_checked signals.',
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
  items: EventsWriteParams['items'],
  getKnowledgeIndicatorClient: () => Promise<KnowledgeIndicatorClient>,
  logger: Logger
): Promise<EventsWriteParams['items']> => {
  const causalFeatures = items.flatMap(({ causal_features: features = [] }) => features);
  const blastRadiusEntries = items.flatMap(({ blast_radius: entries = [] }) => entries);
  if (causalFeatures.length === 0 && blastRadiusEntries.length === 0) {
    return items;
  }

  try {
    // `featureIds` matches slug-style references and `id` matches uuid-style references.
    const references = [...causalFeatures, ...blastRadiusEntries];
    const dependencyEnds = blastRadiusEntries.flatMap((entry) =>
      entry.type === 'dependency' ? [entry.source, entry.target] : []
    );
    const featureIds = [
      ...new Set([...references.map(({ feature_id: featureId }) => featureId), ...dependencyEnds]),
    ];
    const streamNames = [
      ...new Set([
        ...items.flatMap(({ stream_names: names }) => names),
        ...references.flatMap(({ stream_name: streamName }) => streamName ?? []),
      ]),
    ];
    const kiClient = await getKnowledgeIndicatorClient();
    const hits = (
      await Promise.all([
        kiClient.getFeatures(streamNames, {
          featureIds,
          includeExcluded: true,
          includeExpired: true,
        }),
        kiClient.getFeatures(streamNames, {
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
        [`${feature.stream_name}:${feature.id}`, feature] as const,
        [`${feature.stream_name}:${feature.uuid}`, feature] as const,
      ])
    );

    const resolveFeature = (
      featureId: string,
      explicitStream: string | undefined,
      itemStreamNames: string[]
    ) => {
      if (explicitStream !== undefined) {
        return featuresByReference.get(`${explicitStream}:${featureId}`);
      }
      // Without an explicit stream: an unambiguous match wins; otherwise restrict to the
      // event's own streams so a shared slug on another stream cannot stamp the wrong
      // classification.
      const matches = uniqueHits.filter(({ id, uuid }) => id === featureId || uuid === featureId);
      const scoped = matches.filter(({ stream_name }) => itemStreamNames.includes(stream_name));
      return (scoped.length === 1 ? scoped : matches.length === 1 ? matches : [])[0];
    };

    // An entry whose feature_id resolves to no stored indicator is dropped, so presence in the stored event
    // is the deterministic "this KI exists" gate. Dropped ids are logged for the eval trail.
    return items.map((item) => {
      const dropped: string[] = [];
      const unresolvedEnds = new Set<string>();
      const resolvedCausalFeatures = item.causal_features?.flatMap((causalFeature) => {
        const feature = resolveFeature(
          causalFeature.feature_id,
          causalFeature.stream_name,
          item.stream_names
        );
        if (!feature) {
          dropped.push(causalFeature.feature_id);
          return [];
        }
        return [
          {
            ...causalFeature,
            feature_id: feature.id,
            type: feature.type,
            subtype: feature.subtype,
          },
        ];
      });
      // The end of a dependency is an entity, so it resolves without the edge's own stream (an
      // edge can cross streams) and never to another dependency. An end that resolves to no entity
      // is kept verbatim and logged: it matches no entity Knowledge Indicator, so it cannot be
      // traced back to one.
      const resolveEnd = (end: string): string => {
        const resolved = resolveFeature(end, undefined, item.stream_names);
        if (resolved === undefined || resolved.type === 'dependency') {
          unresolvedEnds.add(end);
          return end;
        }
        return resolved.id;
      };
      // Blast radius rows carry their own row-shape discriminator in `type`; only the
      // indicator's subtype is enriched.
      const blastRadius = item.blast_radius?.flatMap((entry) => {
        const feature = resolveFeature(entry.feature_id, entry.stream_name, item.stream_names);
        if (!feature) {
          dropped.push(entry.feature_id);
          return [];
        }
        const ends =
          entry.type === 'dependency'
            ? { source: resolveEnd(entry.source), target: resolveEnd(entry.target) }
            : {};
        return [{ ...entry, ...ends, feature_id: feature.id, subtype: feature.subtype }];
      });
      if (unresolvedEnds.size > 0) {
        logger.warn(
          `events_write: kept ${
            unresolvedEnds.size
          } dependency ends that resolve to no stored entity Knowledge Indicator, so they join no entity: ${[
            ...unresolvedEnds,
          ].join(', ')}`
        );
      }
      if (dropped.length > 0) {
        logger.warn(
          `events_write: dropped ${
            dropped.length
          } topology entries with no stored Knowledge Indicator: ${dropped.join(', ')}`
        );
      }
      return {
        ...item,
        causal_features: resolvedCausalFeatures,
        blast_radius: blastRadius,
      };
    });
  } catch (error) {
    // Fail loudly: writing topology unchecked would store unverified KI references.
    const message = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(
      `events_write: could not resolve topology against Knowledge Indicators: ${message}`
    );
  }
};

/**
 * Stamps each detection signal's `metadata.severity_score` from the query Knowledge Indicator
 * backing its rule. The score is a severity-policy input, so it is read from the KI store rather
 * than trusted from the caller: a value the agent supplied is replaced, and a rule with no backing
 * KI carries none.
 */
const resolveSignalSeverityScores = async (
  items: EventsWriteParams['items'],
  getKnowledgeIndicatorClient: () => Promise<KnowledgeIndicatorClient>,
  logger: Logger
): Promise<EventsWriteParams['items']> => {
  const detectionSignals = items.flatMap(({ signals = [] }) =>
    signals.flatMap((signal) => (signal.type === 'detection' ? [signal] : []))
  );
  if (detectionSignals.length === 0) {
    return items;
  }

  const ruleIds = [...new Set(detectionSignals.map(({ metadata }) => metadata.rule_uuid))];
  const streamNames = [
    ...new Set([
      ...items.flatMap(({ stream_names: names }) => names),
      ...detectionSignals.map(({ stream_name: streamName }) => streamName),
    ]),
  ];

  let scoreByRuleId: Map<string, number>;
  try {
    const kiClient = await getKnowledgeIndicatorClient();
    const links = await kiClient.getQueryLinks(streamNames, { ruleIds, includeExpired: true });
    scoreByRuleId = new Map(
      links.flatMap(({ rule_id: ruleId, query }) =>
        query.severity_score !== undefined ? [[ruleId, query.severity_score] as const] : []
      )
    );
  } catch (error) {
    // Fail loudly: a silently missing score would quietly cap every outage at `high`.
    const message = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(
      `events_write: could not resolve severity_score against Knowledge Indicators: ${message}`
    );
  }

  const unbacked = ruleIds.filter((ruleId) => !scoreByRuleId.has(ruleId));
  if (unbacked.length > 0) {
    logger.warn(
      `events_write: ${
        unbacked.length
      } detection rules have no scored query Knowledge Indicator; their signals carry no severity_score: ${unbacked.join(
        ', '
      )}`
    );
  }

  return items.map((item) => ({
    ...item,
    signals: item.signals?.map((signal) =>
      signal.type === 'detection'
        ? {
            ...signal,
            metadata: {
              ...signal.metadata,
              severity_score: scoreByRuleId.get(signal.metadata.rule_uuid),
            },
          }
        : signal
    ),
  }));
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

      **With event_id**: append a version to an existing event with the supplied status.
      Signals and topology are merged with prior versions, and severity is computed from that
      merged set — it is not an input field. No-op if the computed severity and status are
      unchanged (written: false, reason: unchanged_outcome). For Discovery writes, a completed
      investigation makes the stored severity authoritative over the newly computed one. It is
      preserved unless Discovery marks the event inactive, reactivates an inactive event, or
      submits a confirmed rule UUID absent from the current event. When no new rule UUIDs are
      introduced, title and symptom_hypothesis are frozen to the stored values and
      narrative_preserved: true is returned.

      **Without event_id**: find-or-create. When the item has confirmed rules, scans all
      currently-active events for one that confirms every submitted confirmed rule and shares at
      least one stream name; non-confirming co-signals do not affect the identity. When the item
      has no confirmed rules, every submitted rule is used instead. If found, returns it without
      writing (written: false, reason: existing_active_event). Otherwise creates a new event with
      a generated event_id.
    `,
    annotations: {
      title: 'Write Significant Events',
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
      try {
        const {
          getEventSearchClient,
          getKnowledgeIndicatorClient,
          getAlertEventsClient,
          emitTrigger,
          licensing,
        } = await getScopedClients({
          request,
        });
        await assertSignificantEventsAccess({ server, licensing });
        await assertCanManageSignificantEvents({ request, server });
        const items = await resolveSignalSeverityScores(
          await enrichCausalFeatures(toolParams.items, getKnowledgeIndicatorClient, logger),
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
          alertEventsClient: await getAlertEventsClient(),
          emitTrigger,
          logger,
        });

        data.forEach((result) => {
          const input = toolParams.items[result.index];
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
                stream_names: input.stream_names,
                error_message: isBulkError ? result.error.reason : undefined,
                ...(result.written ? { severity: result.severity, impact: result.impact } : {}),
              }),
          });
        });

        return {
          results: [{ type: ToolResultType.other, data: { results: data } }],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        logger.error(`Error running events_write: ${message}`);
        toolParams.items.forEach((input) => {
          trackTelemetryBestEffort({
            logger,
            description: 'failed events_write telemetry',
            track: () =>
              telemetry.trackAgentToolEventsWrite({
                success: false,
                event_id: input.event_id ?? 'unknown',
                status: input.status,
                written: false,
                stream_names: input.stream_names,
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
