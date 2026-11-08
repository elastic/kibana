/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'node:crypto';
import { z, lazySchema } from '@kbn/zod/v4';
import {
  EVIDENCE_CHART_TYPES,
  EVIDENCE_CHART_X_AXIS_TYPES,
  EVIDENCE_CHART_Y_AXIS_UNITS,
  HYPOTHESIS_STATUSES,
  IMPACT_MAP_ENTITY_KINDS,
  IMPACT_MAP_EVENT_KINDS,
  IMPACT_MAP_HEALTH_STATES,
  IMPACT_MAP_ROLES,
  investigationEvidenceSchema,
  MAX_ENTITY_ID_LENGTH,
  MAX_ENTITY_NAME_LENGTH,
  MAX_EVIDENCE_CHART_ANNOTATIONS,
  MAX_EVIDENCE_CHART_LABEL_LENGTH,
  MAX_EVIDENCE_CHART_POINTS,
  MAX_EVIDENCE_CHART_SERIES,
  MAX_EVIDENCE_SHORT_TEXT_LENGTH,
  MAX_EVIDENCE_TEXT_LENGTH,
  MAX_HYPOTHESES,
  MAX_IMPACT_MAP_ENTITIES,
  MAX_IMPACT_MAP_ENTITY_METADATA,
  MAX_IMPACT_MAP_EVENTS,
  MAX_IMPACT_MAP_RELATIONSHIPS,
  MAX_IMPACT_TOOL_ENTITIES,
  impactMapEventId,
  STANDARD_METADATA_FIELDS,
  toEntityName,
  type ImpactMapEntity,
  type ImpactMapEntityType,
  type ImpactMapEvent,
  type ImpactMapMetadataEntry,
  type ImpactMapMetadataField,
  type ImpactMapRelationship,
  type ImpactMapRelationshipType,
  type InvestigationEvidence,
} from '@kbn/agentic-investigations-plugin/common';
import {
  MAX_COMMENT_LENGTH,
  MAX_TITLE_LENGTH,
  proposalConfidenceSchema,
  proposalImpactSchema,
} from '@kbn/proposals-common';

export const FINDINGS_SEVERITIES = ['low', 'medium', 'high', 'critical'] as const;

const MAX_METADATA_TEXT_LENGTH = 10_000;
/** Actions the final pass may propose for a person to decide. */
export const MAX_PROPOSALS = 3;
/** Evidence charts the recorder may attach to one hypothesis. */
const MAX_HYPOTHESIS_EVIDENCE_ITEMS = 2;

/**
 * What the model may return. Sizes are not enforced here or in {@link FINDINGS_JSON_SCHEMA}: the
 * inference layer rejects a whole call when one string is over its limit, and the model writes
 * close to the limits it is told, so a hard limit throws away good records. {@link limitFindings}
 * trims to the sizes the stores accept instead.
 */
export const findingsOutputSchema = lazySchema(() => {
  const chartSchema = z.object({
    type: z.enum(EVIDENCE_CHART_TYPES),
    title: z.string(),
    x_axis: z.object({
      type: z.enum(EVIDENCE_CHART_X_AXIS_TYPES),
      label: z.string().optional(),
    }),
    y_axis: z.object({
      label: z.string().optional(),
      unit: z.enum(EVIDENCE_CHART_Y_AXIS_UNITS).optional(),
    }),
    stacked: z.boolean().optional(),
    series: z.array(
      z.object({
        name: z.string(),
        points: z.array(z.object({ x: z.string(), y: z.number() })),
      })
    ),
    annotations: z
      .array(z.object({ x: z.string(), x_end: z.string().optional(), label: z.string() }))
      .optional(),
  });
  const evidenceSchema = z.object({
    description: z.string().optional(),
    chart: chartSchema.optional(),
  });
  const hypothesisSchema = z.object({
    candidate: z.string().min(1),
    confidence: z.number(),
    status: z.enum(HYPOTHESIS_STATUSES),
    reason: z.string().optional(),
    evidence: z.array(evidenceSchema).optional(),
  });

  return z.object({
    summary: z.string().min(1),
    verdict: z.string().optional(),
    severity: z.enum(FINDINGS_SEVERITIES).optional(),
    impact_summary: z.string().min(1).optional(),
    // `null` retracts the stored impact evidence; omitting the field keeps it.
    impact_evidence: evidenceSchema.nullable().optional(),
    // Omitting the field keeps the stored entities; an empty list clears them.
    impact_entities: z
      .array(
        z.object({
          name: z.string().min(1),
          type: z.string().min(1).optional(),
          evidence: evidenceSchema.optional(),
        })
      )
      .optional(),
    // Actions for a person to decide. Only the final pass records them.
    proposals: z
      .array(
        z.object({
          title: z.string().min(1),
          comment: z.string().min(1),
          impact: z.string().optional(),
          confidence: z.string().optional(),
        })
      )
      .optional(),
    hypotheses: z.array(hypothesisSchema),
    // Omitting the map keeps the stored one; a pass that includes it replaces it.
    impact_map: z
      .object({
        title: z.string().optional(),
        entities: z.array(
          z.object({
            id: z.string().min(1),
            label: z.string().optional(),
            type: z.string().min(1),
            kind: z.enum(IMPACT_MAP_ENTITY_KINDS).optional(),
            agent_name: z.string().optional(),
            eui_icon: z.string().optional(),
            span_type: z.string().optional(),
            span_subtype: z.string().optional(),
            role: z.enum(IMPACT_MAP_ROLES).optional(),
            health: z.enum(IMPACT_MAP_HEALTH_STATES).optional(),
            impacted: z.boolean().optional(),
            alert_count: z.number().optional(),
            metadata: z
              .array(
                z.object({
                  key: z.string().min(1),
                  value: z.string(),
                  label: z.string().optional(),
                  featured: z.boolean().optional(),
                })
              )
              .optional(),
          })
        ),
        relationships: z.array(
          z.object({
            source: z.string().min(1),
            target: z.string().min(1),
            type: z.string().min(1),
            on_critical_path: z.boolean().optional(),
          })
        ),
      })
      .optional(),
    // Merged by id with the stored events, so a pass sends what is new or changed.
    events: z
      .array(
        z.object({
          kind: z.enum(IMPACT_MAP_EVENT_KINDS),
          title: z.string().min(1),
          description: z.string().optional(),
          at: z.string().min(1),
          ends_at: z.string().optional(),
          entity: z.string().optional(),
          relationship: z.object({ source: z.string(), target: z.string() }).optional(),
          evidence: evidenceSchema.optional(),
        })
      )
      .optional(),
  });
});

export type FindingsOutput = z.infer<typeof findingsOutputSchema>;

const truncate = (text: string, max: number): string =>
  text.length > max ? text.slice(0, max) : text;

type RawEvidence = NonNullable<FindingsOutput['impact_evidence']>;

/** At most `max` items spread evenly over the whole list, always including the first and last. */
const spreadEvenly = <T>(items: readonly T[], max: number): T[] =>
  items.length <= max
    ? [...items]
    : Array.from(
        { length: max },
        (_, i) => items[Math.round((i * (items.length - 1)) / (max - 1))]
      );

const ENTITY_ID_PREFIX_LENGTH = 200;

/**
 * A stable id for an entity. The name when it fits the id limit; otherwise its start plus a hash
 * of the whole name, so two long names with the same start still get different ids.
 */
export const entityIdFor = (name: string): string =>
  name.length <= MAX_ENTITY_ID_LENGTH
    ? name
    : `${name.slice(0, ENTITY_ID_PREFIX_LENGTH)}-${createHash('sha256')
        .update(name)
        .digest('hex')
        .slice(0, 12)}`;

/**
 * A time as an ISO 8601 string, or undefined when it is not a time. Epoch milliseconds or seconds
 * copied from a bucket key become ISO, because the chart reads only what `Date.parse` accepts: a
 * point it cannot place would otherwise leave a chart with a title and no plot.
 */
const chartTimeToIso = (raw: string): string | undefined => {
  const text = raw.trim();
  if (/^\d{10}(\d{3})?$/.test(text)) {
    return new Date(text.length === 10 ? Number(text) * 1000 : Number(text)).toISOString();
  }
  return Number.isNaN(Date.parse(text)) ? undefined : text;
};

/**
 * Trims evidence to what the stores accept. A chart is only the model's reading of numbers in the
 * conversation, so a chart that does not fit (no usable points, or a shape the schema rejects) is
 * dropped and the description is kept.
 */
export const limitEvidence = (raw: RawEvidence): InvestigationEvidence | undefined => {
  const description = raw.description?.trim()
    ? truncate(raw.description, MAX_EVIDENCE_TEXT_LENGTH)
    : undefined;
  const label = (text: string) => truncate(text, MAX_EVIDENCE_CHART_LABEL_LENGTH);
  const short = (text: string) => truncate(text, MAX_EVIDENCE_SHORT_TEXT_LENGTH);
  const isTime = raw.chart?.x_axis.type === 'time';
  const xOf = (x: string) => (isTime ? chartTimeToIso(x) : x || undefined);
  const series = (raw.chart?.series ?? [])
    .slice(0, MAX_EVIDENCE_CHART_SERIES)
    .map(({ name, points }) => ({
      name: label(name),
      // An oversized series is thinned over its whole window, so an event near the end stays.
      points: spreadEvenly(
        points.flatMap(({ x, y }) => {
          const at = xOf(x);
          return at !== undefined && Number.isFinite(y) ? [{ x: at, y }] : [];
        }),
        MAX_EVIDENCE_CHART_POINTS
      ).map(({ x, y }) => ({ x: label(x), y })),
    }))
    .filter(({ points }) => points.length > 0);
  const chart =
    raw.chart && series.length > 0
      ? {
          type: raw.chart.type,
          title: short(raw.chart.title),
          x_axis: {
            type: raw.chart.x_axis.type,
            ...(raw.chart.x_axis.label ? { label: label(raw.chart.x_axis.label) } : {}),
          },
          y_axis: {
            ...(raw.chart.y_axis.label ? { label: label(raw.chart.y_axis.label) } : {}),
            ...(raw.chart.y_axis.unit ? { unit: raw.chart.y_axis.unit } : {}),
          },
          ...(raw.chart.stacked !== undefined ? { stacked: raw.chart.stacked } : {}),
          series,
          ...(raw.chart.annotations?.length
            ? {
                annotations: raw.chart.annotations
                  .slice(0, MAX_EVIDENCE_CHART_ANNOTATIONS)
                  .map(({ x, x_end: xEnd, label: text }) => ({
                    x: label(xOf(x) ?? x),
                    ...(xEnd ? { x_end: label(xOf(xEnd) ?? xEnd) } : {}),
                    label: short(text),
                  })),
              }
            : {}),
        }
      : undefined;
  const parsed = investigationEvidenceSchema.safeParse({
    ...(description ? { description } : {}),
    ...(chart ? { chart } : {}),
  });
  if (parsed.success && (parsed.data.description || parsed.data.chart)) return parsed.data;
  return description ? { description } : undefined;
};

/** The impact map in the shape the impact map store accepts. */
export interface FindingsImpactMap {
  title?: string;
  entities: ImpactMapEntity[];
  relationships: ImpactMapRelationship[];
  entity_types: ImpactMapEntityType[];
  relationship_types: ImpactMapRelationshipType[];
}

const MAX_MAP_ID_LENGTH = 256;
const MAX_MAP_LABEL_LENGTH = 256;
const MAX_MAP_TYPE_ID_LENGTH = 64;
const MAX_MAP_ICON_KEY_LENGTH = 64;
const MAX_MAP_ALERT_COUNT = 9_999;
const MAX_MAP_METADATA_KEY_LENGTH = 96;
const MAX_MAP_METADATA_VALUE_LENGTH = 500;

/** A catalog type id: lowercase, with anything the store rejects replaced by `_`. */
export const toImpactMapTypeId = (raw: string): string =>
  raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_.-]+/g, '_')
    .replace(/^[^a-z0-9]+/, '')
    .slice(0, MAX_MAP_TYPE_ID_LENGTH) || 'entity';

/** A metadata key: lowercase and dotted, with anything the store rejects replaced by `_`. */
export const toMetadataKey = (raw: string): string =>
  raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_.-]+/g, '_')
    .replace(/^[^a-z0-9]+/, '')
    .slice(0, MAX_MAP_METADATA_KEY_LENGTH);

const limitMetadata = (
  raw: NonNullable<NonNullable<FindingsOutput['impact_map']>['entities'][number]['metadata']>
): ImpactMapMetadataEntry[] => {
  const byKey = new Map<string, ImpactMapMetadataEntry>();
  for (const { key, value, label, featured } of raw) {
    const cleanKey = toMetadataKey(key);
    const cleanValue = truncate(value.trim(), MAX_MAP_METADATA_VALUE_LENGTH);
    if (!cleanKey || !cleanValue || byKey.has(cleanKey)) continue;
    if (byKey.size >= MAX_IMPACT_MAP_ENTITY_METADATA) break;
    const cleanLabel = label?.trim();
    byKey.set(cleanKey, {
      key: cleanKey,
      value: cleanValue,
      ...(cleanLabel ? { label: truncate(cleanLabel, MAX_MAP_LABEL_LENGTH) } : {}),
      ...(featured !== undefined ? { featured } : {}),
    });
  }
  return [...byKey.values()];
};

const humanizeTypeId = (id: string): string => {
  const words = id.replace(/[_.-]+/g, ' ').trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
};

const INFRASTRUCTURE_THING =
  /(^|[^a-z])(k8s|kubernetes|deployment|statefulset|daemonset|replicaset|pod|node|host|vm|container|cluster|namespace|load[ _-]?balancer|ec2|lambda)([^a-z]|$)/i;
const KUBERNETES_OBJECT =
  /(^|[^a-z])(k8s|kubernetes|deployment|statefulset|daemonset|replicaset|pod)([^a-z]|$)/i;
const DEPENDENCY_THING =
  /(database|(^|[^a-z])db([^a-z]|$)|sql|mongo|redis|memcache|cache|elasticsearch|kafka|queue|topic|rabbit|sqs|sns|pubsub|bucket|s3|storage|load[ _-]?balancer|gateway|proxy|external|third[ _-]?party|api[ _-]?endpoint|endpoint|http)/i;

/**
 * A first classification for a new entity type the model left unclassified: the shape (a dependency
 * diamond for what services rely on, a service circle for what runs code) and, for a Kubernetes
 * object, its logo. The catalog keeps it, so it is decided once for every later investigation.
 */
export const classifyEntityType = (
  typeId: string
): { kind: 'service' | 'dependency' | 'infrastructure'; euiIcon?: string } => {
  if (KUBERNETES_OBJECT.test(typeId)) return { kind: 'infrastructure', euiIcon: 'logoKubernetes' };
  if (INFRASTRUCTURE_THING.test(typeId)) return { kind: 'infrastructure' };
  return { kind: DEPENDENCY_THING.test(typeId) ? 'dependency' : 'service' };
};

/**
 * Trims the model's impact map to what the store accepts and turns its flat entity fields into the
 * store's shape: an entity type for each `type` that names a kind or an icon, so the catalog
 * learns it, and a relationship type for each relationship `type`. Relationships to an entity the
 * map does not list are dropped: the store rejects a whole map for one of them.
 */
export const limitImpactMap = (
  raw: NonNullable<FindingsOutput['impact_map']>,
  /** Type ids the catalog already holds: they are not redefined from here. */
  knownTypeIds: ReadonlySet<string> = new Set(),
  /** The catalog's types by id: a known type is taught the metadata fields this map shows for it. */
  knownTypes: ReadonlyMap<string, ImpactMapEntityType> = new Map()
): FindingsImpactMap | undefined => {
  const icon = (value?: string) => (value ? truncate(value, MAX_MAP_ICON_KEY_LENGTH) : undefined);
  const entityTypes = new Map<string, ImpactMapEntityType>();
  const seen = new Set<string>();
  const entities: ImpactMapEntity[] = [];
  const fieldUpdates = new Map<string, Map<string, ImpactMapMetadataField>>();

  for (const entity of raw.entities) {
    const id = truncate(entity.id.trim(), MAX_MAP_ID_LENGTH);
    if (!id || seen.has(id) || entities.length >= MAX_IMPACT_MAP_ENTITIES) continue;
    seen.add(id);
    const typeId = toImpactMapTypeId(entity.type);
    const agentName = icon(entity.agent_name);
    const euiIcon = icon(entity.eui_icon);
    const spanType = icon(entity.span_type);
    const spanSubtype = icon(entity.span_subtype);
    const metadata = entity.metadata ? limitMetadata(entity.metadata) : [];
    const knownType = knownTypes.get(typeId);
    if (knownType && metadata.length) {
      const have = new Set([
        ...(knownType.metadata_fields ?? []).map(({ key }) => key),
        ...STANDARD_METADATA_FIELDS.map(({ key }) => key),
      ]);
      const learned = fieldUpdates.get(typeId) ?? new Map<string, ImpactMapMetadataField>();
      metadata
        .filter(({ key }) => !have.has(key))
        .forEach(({ key, label, featured }) =>
          learned.set(key, {
            key,
            label: label ?? humanizeTypeId(key.replace(/[._]+/g, ' ')),
            ...(featured !== undefined ? { featured } : {}),
          })
        );
      if (learned.size) fieldUpdates.set(typeId, learned);
    }
    if (!entityTypes.has(typeId) && !knownTypeIds.has(typeId)) {
      const guess = classifyEntityType(typeId);
      const euiName = euiIcon ?? (agentName || spanType || spanSubtype ? undefined : guess.euiIcon);
      entityTypes.set(typeId, {
        id: typeId,
        label: humanizeTypeId(typeId),
        kind: entity.kind ?? (spanType || spanSubtype ? 'dependency' : guess.kind),
        ...(agentName || euiName || spanType || spanSubtype
          ? {
              icon: {
                ...(agentName ? { agent_name: agentName } : {}),
                ...(euiName ? { eui_icon: euiName } : {}),
                ...(spanType ? { span_type: spanType } : {}),
                ...(spanSubtype ? { span_subtype: spanSubtype } : {}),
              },
            }
          : {}),
        // The first entity of a new type teaches the catalog which fields the type carries.
        ...(metadata.length
          ? {
              metadata_fields: metadata.map(({ key, label, featured }) => ({
                key,
                label:
                  label ??
                  STANDARD_METADATA_FIELDS.find((field) => field.key === key)?.label ??
                  humanizeTypeId(key.replace(/[._]+/g, ' ')),
                ...(featured !== undefined ? { featured } : {}),
              })),
            }
          : {}),
      });
    }
    const alertCount =
      entity.alert_count !== undefined && Number.isFinite(entity.alert_count)
        ? Math.min(MAX_MAP_ALERT_COUNT, Math.max(0, Math.round(entity.alert_count)))
        : undefined;
    const annotations = {
      ...(entity.role ? { role: entity.role } : {}),
      ...(entity.health ? { health: entity.health } : {}),
      ...(entity.impacted !== undefined ? { impacted: entity.impacted } : {}),
      ...(alertCount ? { alert_count: alertCount } : {}),
    };
    entities.push({
      id,
      type_id: typeId,
      label: truncate(toEntityName(entity.label?.trim() || id), MAX_MAP_LABEL_LENGTH),
      ...(Object.keys(annotations).length ? { annotations } : {}),
      ...(metadata.length ? { metadata } : {}),
    });
  }
  if (entities.length === 0) return undefined;

  // The catalog adds fields up by key, so a known type is sent with only what it has just learned.
  fieldUpdates.forEach((fields, typeId) => {
    const known = knownTypes.get(typeId);
    if (known && !entityTypes.has(typeId)) {
      entityTypes.set(typeId, {
        id: known.id,
        label: known.label,
        kind: known.kind,
        metadata_fields: [...fields.values()],
      });
    }
  });

  const relationshipTypes = new Map<string, ImpactMapRelationshipType>();
  const relationships: ImpactMapRelationship[] = [];
  for (const relationship of raw.relationships) {
    const source = truncate(relationship.source.trim(), MAX_MAP_ID_LENGTH);
    const target = truncate(relationship.target.trim(), MAX_MAP_ID_LENGTH);
    if (!seen.has(source) || !seen.has(target)) continue;
    if (relationships.length >= MAX_IMPACT_MAP_RELATIONSHIPS) break;
    const typeId = toImpactMapTypeId(relationship.type);
    if (!relationshipTypes.has(typeId)) {
      relationshipTypes.set(typeId, {
        id: typeId,
        label: typeId.replace(/[_.-]+/g, ' ').trim(),
      });
    }
    relationships.push({
      type_id: typeId,
      source_id: source,
      target_id: target,
      ...(relationship.on_critical_path ? { on_critical_path: true } : {}),
    });
  }

  return {
    ...(raw.title?.trim() ? { title: truncate(raw.title.trim(), MAX_MAP_LABEL_LENGTH) } : {}),
    entities,
    relationships,
    entity_types: [...entityTypes.values()],
    relationship_types: [...relationshipTypes.values()],
  };
};

const MAX_EVENT_DESCRIPTION_LENGTH = 1_000;

/** An ISO 8601 time the store can sort by, or undefined when the model wrote something else. */
const toIsoTime = (value?: string): string | undefined => {
  if (!value) return undefined;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? undefined : new Date(parsed).toISOString();
};

/**
 * Trims events to what the store accepts and gives each a stable id, so the next pass that
 * describes the same event updates it. An event with no time it can be placed at is dropped, and
 * only a finding or a response may belong to neither an entity nor a relationship.
 */
export const limitEvents = (raw: NonNullable<FindingsOutput['events']>): ImpactMapEvent[] => {
  const byId = new Map<string, ImpactMapEvent>();
  for (const event of raw) {
    const at = toIsoTime(event.at);
    const title = event.title.trim();
    if (!at || !title) continue;
    const entityId = event.entity?.trim()
      ? truncate(event.entity.trim(), MAX_MAP_ID_LENGTH)
      : undefined;
    const relationshipId =
      !entityId && event.relationship?.source.trim() && event.relationship.target.trim()
        ? truncate(
            `${event.relationship.source.trim()}->${event.relationship.target.trim()}`,
            MAX_MAP_ID_LENGTH
          )
        : undefined;
    if (!entityId && !relationshipId && event.kind !== 'response' && event.kind !== 'investigation')
      continue;
    const endsAt = toIsoTime(event.ends_at);
    const evidence = event.evidence ? limitEvidence(event.evidence) : undefined;
    const target = {
      ...(entityId ? { entity_id: entityId } : {}),
      ...(relationshipId ? { relationship_id: relationshipId } : {}),
    };
    const id = impactMapEventId({ kind: event.kind, at, ...target });
    byId.set(id, {
      id,
      kind: event.kind,
      title: truncate(title, MAX_MAP_LABEL_LENGTH),
      ...(event.description?.trim()
        ? { description: truncate(event.description.trim(), MAX_EVENT_DESCRIPTION_LENGTH) }
        : {}),
      at,
      ...(endsAt ? { ends_at: endsAt } : {}),
      ...target,
      ...(evidence ? { evidence } : {}),
    });
  }
  return [...byId.values()].slice(0, MAX_IMPACT_MAP_EVENTS);
};

/** A parsed record with its evidence trimmed to what the stores accept. */
export type FindingsRecord = Omit<
  FindingsOutput,
  'impact_evidence' | 'impact_entities' | 'hypotheses' | 'proposals' | 'impact_map' | 'events'
> & {
  /** Absent when the pass recorded none that could be placed. */
  events?: ImpactMapEvent[];
  /** Absent when the model drew no map or none of its entities fit. */
  impact_map?: FindingsImpactMap;
  proposals?: Array<{ title: string; comment: string; impact?: string; confidence?: string }>;
  /** `null` retracts the stored evidence. */
  impact_evidence?: InvestigationEvidence | null;
  impact_entities?: Array<{ name: string; type?: string; evidence?: InvestigationEvidence }>;
  hypotheses: Array<
    Omit<FindingsOutput['hypotheses'][number], 'evidence'> & { evidence?: InvestigationEvidence[] }
  >;
};

/** Trims a parsed record to the sizes the metadata, hypotheses and impact stores accept. */
export const limitFindings = (
  output: FindingsOutput,
  knownTypeIds?: ReadonlySet<string>,
  knownTypes?: ReadonlyMap<string, ImpactMapEntityType>
): FindingsRecord => {
  // The fields that carry evidence are rebuilt below, so the raw ones are not spread back in.
  const {
    impact_evidence: rawImpactEvidence,
    impact_entities: rawEntities,
    proposals: rawProposals,
    hypotheses: rawHypotheses,
    impact_map: rawImpactMap,
    events: rawEvents,
    ...rest
  } = output;
  const events = rawEvents ? limitEvents(rawEvents) : [];
  const impactEvidence = rawImpactEvidence ? limitEvidence(rawImpactEvidence) : rawImpactEvidence;
  const impactMap = rawImpactMap
    ? limitImpactMap(rawImpactMap, knownTypeIds, knownTypes)
    : undefined;
  return {
    ...rest,
    ...(impactMap ? { impact_map: impactMap } : {}),
    ...(events.length ? { events } : {}),
    impact_evidence: impactEvidence,
    summary: truncate(output.summary, MAX_METADATA_TEXT_LENGTH),
    ...(output.verdict !== undefined
      ? { verdict: truncate(output.verdict, MAX_METADATA_TEXT_LENGTH) }
      : {}),
    ...(output.impact_summary !== undefined
      ? { impact_summary: truncate(output.impact_summary, MAX_EVIDENCE_TEXT_LENGTH) }
      : {}),
    ...(rawEntities !== undefined
      ? {
          impact_entities: rawEntities
            .slice(0, MAX_IMPACT_TOOL_ENTITIES)
            .map(({ name, type, evidence }) => {
              const kept = evidence ? limitEvidence(evidence) : undefined;
              return {
                name: truncate(name, MAX_ENTITY_NAME_LENGTH),
                ...(type !== undefined ? { type: truncate(type, MAX_ENTITY_ID_LENGTH) } : {}),
                ...(kept ? { evidence: kept } : {}),
              };
            }),
        }
      : {}),
    ...(rawProposals !== undefined
      ? {
          proposals: rawProposals
            .slice(0, MAX_PROPOSALS)
            .map(({ title, comment, impact, confidence }) => ({
              title: truncate(title.trim(), MAX_TITLE_LENGTH),
              comment: truncate(comment, MAX_COMMENT_LENGTH),
              // A value the proposal store does not know is left out, not sent to fail the write.
              ...(impact && proposalImpactSchema.safeParse(impact).success ? { impact } : {}),
              ...(confidence && proposalConfidenceSchema.safeParse(confidence).success
                ? { confidence }
                : {}),
            })),
        }
      : {}),
    hypotheses: rawHypotheses.slice(0, MAX_HYPOTHESES).map(({ evidence, ...hypothesis }) => {
      const kept = (evidence ?? [])
        .map(limitEvidence)
        .filter((item): item is InvestigationEvidence => item !== undefined)
        .slice(0, MAX_HYPOTHESIS_EVIDENCE_ITEMS);
      return {
        ...hypothesis,
        candidate: truncate(hypothesis.candidate, MAX_EVIDENCE_TEXT_LENGTH),
        confidence: Math.min(1, Math.max(0, hypothesis.confidence)),
        ...(hypothesis.reason !== undefined
          ? { reason: truncate(hypothesis.reason, MAX_EVIDENCE_TEXT_LENGTH) }
          : {}),
        ...(kept.length ? { evidence: kept } : {}),
      };
    }),
  };
};

const EVIDENCE_JSON_SCHEMA = {
  type: 'object',
  description:
    'An observation that backs the claim: a short description, a small chart, or both. Add a chart only when the tool results in this conversation contain the numbers: copy the values exactly, never estimate or invent points, and describe instead when the numbers were clipped.',
  properties: {
    description: {
      type: 'string',
      description:
        'Markdown: what was observed and why it matters, only what a chart does not already show.',
    },
    chart: {
      type: 'object',
      properties: {
        type: { type: 'string', enum: EVIDENCE_CHART_TYPES },
        title: { type: 'string', description: 'What it measures and the time window.' },
        x_axis: {
          type: 'object',
          properties: {
            type: { type: 'string', enum: EVIDENCE_CHART_X_AXIS_TYPES },
            label: { type: 'string' },
          },
          required: ['type'],
        },
        y_axis: {
          type: 'object',
          properties: {
            label: { type: 'string' },
            unit: {
              type: 'string',
              enum: EVIDENCE_CHART_Y_AXIS_UNITS,
              description: 'percent values are on a 0 to 100 scale.',
            },
          },
        },
        stacked: { type: 'boolean' },
        series: {
          type: 'array',
          description: 'Up to 5 series of at most about 30 points each.',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              points: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    x: {
                      type: 'string',
                      description: 'ISO 8601 timestamp for a time axis, else a category label.',
                    },
                    y: { type: 'number' },
                  },
                  required: ['x', 'y'],
                },
              },
            },
            required: ['name', 'points'],
          },
        },
        annotations: {
          type: 'array',
          description: 'At most 5: for example when the problem began.',
          items: {
            type: 'object',
            properties: {
              x: { type: 'string' },
              x_end: { type: 'string' },
              label: { type: 'string' },
            },
            required: ['x', 'label'],
          },
        },
      },
      required: ['type', 'title', 'x_axis', 'y_axis', 'series'],
    },
  },
} as const;

/** The same shape as {@link findingsOutputSchema}, for the inference client. */
export const FINDINGS_JSON_SCHEMA = {
  type: 'object',
  properties: {
    summary: {
      type: 'string',
      description:
        'What we saw and since when, not the cause. At most 60 words of Markdown: a lead sentence of at most 25 words, then at most three short bullets.',
    },
    verdict: {
      type: 'string',
      description:
        'Only when the agent has given its final answer: the most likely cause. At most 70 words of Markdown: a lead sentence of at most 25 words, then at most three short bullets. Starts with Cause not confirmed: when no hypothesis is confirmed. Omit while the investigation is still running.',
    },
    severity: {
      type: 'string',
      enum: FINDINGS_SEVERITIES,
      description: 'Severity of the situation investigated, decided from what was confirmed.',
    },
    impact_summary: {
      type: 'string',
      description:
        'The business consequence: who or what was hurt and how badly, with measured numbers. At most 45 words: a lead sentence of at most 25 words, then at most three short bullets. Omit when the evidence shows no impact yet.',
    },
    impact_evidence: {
      anyOf: [EVIDENCE_JSON_SCHEMA, { type: 'null' }],
      description:
        'Evidence of the impact: for example a chart of the error rate or request volume over the window. Omit to keep the stored evidence, or when the conversation holds no numbers for it. Use null only to retract evidence you now know is wrong.',
    },
    impact_entities: {
      type: 'array',
      description:
        'Only when two or more services or components were affected in different ways, grouped at service level. At most 5. Omit to keep the stored entities; an empty list removes them.',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          type: { type: 'string', description: 'For example service, host or database.' },
          evidence: {
            ...EVIDENCE_JSON_SCHEMA,
            description:
              'How this entity was affected: a short description, a small chart of its own failure signal, or both. Keep the stored evidence when you list the entity again.',
          },
        },
        required: ['name'],
      },
    },
    proposals: {
      type: 'array',
      description: `Concrete actions for a person to decide, at most ${MAX_PROPOSALS}: a command, a config change, a code fix or a rollback the findings support. Leave out general advice and anything already proposed.`,
      items: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Short plain text naming the action.' },
          comment: {
            type: 'string',
            description:
              'What to do and why, in Markdown: the concrete steps and the findings that support them.',
          },
          impact: {
            type: 'string',
            enum: proposalImpactSchema.options,
            description: 'How disruptive carrying out the action is.',
          },
          confidence: {
            type: 'string',
            enum: proposalConfidenceSchema.options,
            description: 'How strongly the findings support that this action resolves the issue.',
          },
        },
        required: ['title', 'comment'],
      },
    },
    hypotheses: {
      type: 'array',
      description:
        'Every candidate cause considered so far, each with its own confidence and status. A snapshot: it replaces the stored list. At most 8.',
      items: {
        type: 'object',
        properties: {
          candidate: {
            type: 'string',
            description:
              'The name on the card: a noun phrase of at most eight words, with no counts or ids.',
          },
          confidence: { type: 'number', description: 'From 0 to 1.' },
          status: { type: 'string', enum: HYPOTHESIS_STATUSES },
          reason: {
            type: 'string',
            description:
              'Two Markdown lines: **Tested:** what was checked, against which signal and window, then **Result:** what the data showed, ending in Confirmed, Dismissed or Unresolved. Under 600 characters.',
          },
          evidence: {
            type: 'array',
            description:
              'At most 2, only for the confirmed or leading hypothesis: the observations that decided it.',
            items: EVIDENCE_JSON_SCHEMA,
          },
        },
        required: ['candidate', 'confidence', 'status'],
      },
    },
    impact_map: {
      type: 'object',
      description: `Only once the cause is confirmed or leading: a map of the entities the problem touches and how they depend on each other, from the symptom to the root cause. At most ${MAX_IMPACT_MAP_ENTITIES} entities, usually 3 to 12. Only entities and dependencies the tool results show; leave out what was not looked at. Omit to keep the stored map.`,
      properties: {
        title: {
          type: 'string',
          description: 'A few words naming what the map shows, for example Checkout failures.',
        },
        entities: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description:
                  'Unique in the map: the bare name of the thing itself, such as checkout, shipping or quote-old. Never its type, a state, a count or an endpoint.',
              },
              label: {
                type: 'string',
                description:
                  'The bare name of the entity, as its owner would call it: shipping, not "k8s deployment: shipping (0/0)". What kind of thing it is goes in type; what is wrong with it (0 replicas, NXDOMAIN, a port, an operation) goes in events. Defaults to the id.',
              },
              type: {
                type: 'string',
                description:
                  'One lowercase id per kind of entity that looks the same, reused across investigations, for example nodejs_service, java_service, postgresql, kafka_topic, k8s_pod.',
              },
              kind: {
                type: 'string',
                enum: IMPACT_MAP_ENTITY_KINDS,
                description:
                  'Classify by what the thing fundamentally is. service draws a circle, for application code you run; dependency draws a diamond, for a database, queue, cache or external API that services call; infrastructure draws a rounded square, for what runs and hosts them: a Kubernetes deployment, pod or node, a host, VM, container, cloud resource or load balancer.',
              },
              agent_name: {
                type: 'string',
                description:
                  'For a service, the APM agent name for its icon: nodejs, java, go, python, dotnet, ruby, php, rum-js or opentelemetry.',
              },
              eui_icon: {
                type: 'string',
                description:
                  'For something with no APM agent, an EUI icon name. Always logoKubernetes for a Kubernetes deployment, pod, node, statefulset, daemonset or namespace; logoDocker for a container; logoAWS, logoGCP or logoAzure for cloud resources.',
              },
              span_type: {
                type: 'string',
                description:
                  'For a dependency, its span type for the icon: db, messaging, cache or external.',
              },
              span_subtype: {
                type: 'string',
                description:
                  'For a dependency, its span subtype for the icon: postgresql, mysql, elasticsearch, redis, kafka, http and so on.',
              },
              role: {
                type: 'string',
                enum: IMPACT_MAP_ROLES,
                description:
                  'root_cause for the confirmed or leading cause, symptom where the problem was seen, contributor for something that made it worse, context for the rest.',
              },
              health: { type: 'string', enum: IMPACT_MAP_HEALTH_STATES },
              impacted: {
                type: 'boolean',
                description: 'True when the problem hurt this entity or its users.',
              },
              alert_count: {
                type: 'number',
                description: 'Open alerts on this entity, only when the tool results show them.',
              },
              metadata: {
                type: 'array',
                description: `At most ${MAX_IMPACT_MAP_ENTITY_METADATA}. Facts that help a person understand and locate the entity, taken from tool results only: its cloud provider, region, availability zone, Kubernetes cluster, namespace, node, host, version, owner. Reuse the keys listed under the catalog; add your own lowercase dotted key and a label for anything else that helps. Set featured on the few that matter most, such as cluster and namespace.`,
                items: {
                  type: 'object',
                  properties: {
                    key: {
                      type: 'string',
                      description:
                        'Lowercase and dotted, like an OpenTelemetry attribute: cloud.availability_zone, k8s.namespace.name.',
                    },
                    value: { type: 'string' },
                    label: { type: 'string', description: 'Only for a key you made up.' },
                    featured: { type: 'boolean' },
                  },
                  required: ['key', 'value'],
                },
              },
            },
            required: ['id', 'type'],
          },
        },
        relationships: {
          type: 'array',
          description: `At most ${MAX_IMPACT_MAP_RELATIONSHIPS}. Point each from the caller or dependent to what it depends on.`,
          items: {
            type: 'object',
            properties: {
              source: { type: 'string', description: 'An entity id.' },
              target: { type: 'string', description: 'An entity id.' },
              type: {
                type: 'string',
                description:
                  'A lowercase verb, reused across investigations: calls, reads_from, writes_to, publishes_to, runs_on.',
              },
              on_critical_path: {
                type: 'boolean',
                description: 'True for each hop on the path from the symptom to the root cause.',
              },
            },
            required: ['source', 'target', 'type'],
          },
        },
      },
      required: ['entities', 'relationships'],
    },
    events: {
      type: 'array',
      description: `What happened, each placed against the entity or relationship of the impact map it happened to, so the map shows where and the timeline shows when. New or changed events only: they are merged with the ones already recorded. Only what the tool results or the conversation show, with the time they show. At most ${MAX_IMPACT_MAP_EVENTS}.`,
      items: {
        type: 'object',
        properties: {
          kind: {
            type: 'string',
            enum: IMPACT_MAP_EVENT_KINDS,
            description:
              'change for a deploy, config or scaling change; failure for errors, crashes, timeouts or restarts; condition for a state such as saturation, a full disk or zero replicas; alert for an alert that fired; mitigation for a fix applied; customer_impact for what customers felt, placed on the entry point they use; investigation for a finding of the investigation, such as a hypothesis confirmed or ruled out; response for what responders did, such as opening an incident channel or updating the status page.',
          },
          title: {
            type: 'string',
            description:
              'One line in the past tense with the measured number, for example Replicas scaled from 3 to 0 or Checkout error rate rose to 42%.',
          },
          description: {
            type: 'string',
            description: 'At most two sentences: what the data showed and why it matters.',
          },
          at: { type: 'string', description: 'When it happened or started, ISO 8601.' },
          ends_at: { type: 'string', description: 'When it ended, if it has.' },
          entity: {
            type: 'string',
            description:
              'The id of the impact map entity it happened to. Use the same id as in impact_map.',
          },
          relationship: {
            type: 'object',
            description:
              'Instead of entity, the relationship it happened to, such as timeouts on calls from one service to another.',
            properties: {
              source: { type: 'string', description: 'An entity id.' },
              target: { type: 'string', description: 'An entity id.' },
            },
            required: ['source', 'target'],
          },
          evidence: {
            ...EVIDENCE_JSON_SCHEMA,
            description:
              'A chart that explains the event in context: the signal that shows it, over a window that starts before the change that led to it, with an annotation at that change and one at the event. Copy only numbers a tool returned; describe instead when there are none.',
          },
        },
        required: ['kind', 'title', 'at'],
      },
    },
  },
  required: ['summary', 'hypotheses'],
} as const;

const { evidence: _hypothesisEvidence, ...LIVE_HYPOTHESIS_PROPERTIES } =
  FINDINGS_JSON_SCHEMA.properties.hypotheses.items.properties;

/**
 * What a live pass may answer while the investigation runs: the summary, the hypothesis tree, the
 * impact map and its events. The rest of the record, with its evidence, is written once, from the final pass.
 */
export const LIVE_FINDINGS_JSON_SCHEMA = {
  type: 'object',
  properties: {
    summary: FINDINGS_JSON_SCHEMA.properties.summary,
    hypotheses: {
      ...FINDINGS_JSON_SCHEMA.properties.hypotheses,
      description:
        'Every candidate cause considered so far, each with its own confidence, status and reason. A snapshot: it replaces the stored list. At most 8.',
      items: {
        ...FINDINGS_JSON_SCHEMA.properties.hypotheses.items,
        properties: LIVE_HYPOTHESIS_PROPERTIES,
      },
    },
    // Redrawn whenever new evidence changes it, so the map never lags the findings.
    impact_map: FINDINGS_JSON_SCHEMA.properties.impact_map,
    // Recorded as they are found, so the timeline fills while the investigation runs.
    events: FINDINGS_JSON_SCHEMA.properties.events,
  },
  required: ['summary', 'hypotheses'],
} as const;
