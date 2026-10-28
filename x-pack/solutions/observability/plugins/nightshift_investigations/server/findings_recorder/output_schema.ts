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
  MAX_IMPACT_TOOL_ENTITIES,
  type InvestigationEvidence,
} from '@kbn/agentic-investigations-plugin/common';

export const FINDINGS_SEVERITIES = ['low', 'medium', 'high', 'critical'] as const;

const MAX_METADATA_TEXT_LENGTH = 10_000;
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
    hypotheses: z.array(hypothesisSchema),
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
  const series = (raw.chart?.series ?? [])
    .slice(0, MAX_EVIDENCE_CHART_SERIES)
    .map(({ name, points }) => ({
      name: label(name),
      // An oversized series is thinned over its whole window, so an event near the end stays.
      points: spreadEvenly(
        points.filter(({ x, y }) => x !== '' && Number.isFinite(y)),
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
                    x: label(x),
                    ...(xEnd ? { x_end: label(xEnd) } : {}),
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

/** A parsed record with its evidence trimmed to what the stores accept. */
export type FindingsRecord = Omit<
  FindingsOutput,
  'impact_evidence' | 'impact_entities' | 'hypotheses'
> & {
  /** `null` retracts the stored evidence. */
  impact_evidence?: InvestigationEvidence | null;
  impact_entities?: Array<{ name: string; type?: string; evidence?: InvestigationEvidence }>;
  hypotheses: Array<
    Omit<FindingsOutput['hypotheses'][number], 'evidence'> & { evidence?: InvestigationEvidence[] }
  >;
};

/** Trims a parsed record to the sizes the metadata, hypotheses and impact stores accept. */
export const limitFindings = (output: FindingsOutput): FindingsRecord => {
  const impactEvidence = output.impact_evidence
    ? limitEvidence(output.impact_evidence)
    : output.impact_evidence;
  return {
    ...output,
    impact_evidence: impactEvidence,
    summary: truncate(output.summary, MAX_METADATA_TEXT_LENGTH),
    ...(output.verdict !== undefined
      ? { verdict: truncate(output.verdict, MAX_METADATA_TEXT_LENGTH) }
      : {}),
    ...(output.impact_summary !== undefined
      ? { impact_summary: truncate(output.impact_summary, MAX_EVIDENCE_TEXT_LENGTH) }
      : {}),
    ...(output.impact_entities !== undefined
      ? {
          impact_entities: output.impact_entities
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
    hypotheses: output.hypotheses.slice(0, MAX_HYPOTHESES).map(({ evidence, ...hypothesis }) => {
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
        'What happened, as far as the evidence shows: what deviated, when and where, and the current leading explanation. Two to four plain sentences, under 800 characters.',
    },
    verdict: {
      type: 'string',
      description:
        'Only when the agent has given its final answer: the conclusion in one or two sentences, with the root cause and the mechanism. Omit while the investigation is still running. Under 600 characters.',
    },
    severity: {
      type: 'string',
      enum: FINDINGS_SEVERITIES,
      description: 'Severity of the situation investigated, decided from what was confirmed.',
    },
    impact_summary: {
      type: 'string',
      description:
        'The business consequence in one or two plain sentences: who or what was affected, how badly, for how long, how broadly, with measured numbers. Omit when the evidence shows no impact yet. Under 500 characters.',
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
    hypotheses: {
      type: 'array',
      description:
        'Every candidate cause considered so far, each with its own confidence and status. A snapshot: it replaces the stored list. At most 8.',
      items: {
        type: 'object',
        properties: {
          candidate: { type: 'string', description: 'The candidate cause, stated concretely.' },
          confidence: { type: 'number', description: 'From 0 to 1.' },
          status: { type: 'string', enum: HYPOTHESIS_STATUSES },
          reason: {
            type: 'string',
            description:
              'Why it was dismissed or confirmed, or the current reasoning while investigating. Markdown, under 300 characters.',
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
  },
  required: ['summary', 'hypotheses'],
} as const;
