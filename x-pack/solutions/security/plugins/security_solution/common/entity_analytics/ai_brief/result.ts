/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Attachment } from '@kbn/agent-builder-common/attachments';
import { z, lazySchema } from '@kbn/zod/v4';
import { EntityRiskLevels } from '../../api/entity_analytics/common/common.gen';
import type { SecurityAgentBuilderAttachments } from '../../constants';
import { SIGNAL_CARD_IDS, TIME_RANGE_OPTIONS } from '../home/constants';

const riskHistorySchema = lazySchema(() =>
  z
    .object({
      of: z.enum(['entity', 'resolution group']),
      from: z.iso.datetime(),
      to: z.iso.datetime(),
      // The brief producer samples at most 12 captured history points.
      points: z
        .array(
          z
            .object({
              t: z.iso.datetime(),
              score: z.number().min(0).max(100),
              level: EntityRiskLevels,
            })
            .strict()
        )
        .max(12),
    })
    .strict()
);

export const BriefViewModel = lazySchema(() =>
  z
    .object({
      version: z.literal(1),
      scope: z
        .object({
          period: z.enum(TIME_RANGE_OPTIONS),
          periodLabel: z.string().max(128),
          capturedAt: z.iso.datetime(),
          spaceId: z.string().max(256),
          focusTileTitle: z.string().max(256).optional(),
          entityFilters: z
            .array(z.object({ label: z.string().max(64), value: z.string().max(13_000) }).strict())
            .max(32),
          sample: z.string().max(512).optional(),
        })
        .strict(),
      notChecked: z
        .object({
          unreadable: z.array(z.string().max(200)).max(SIGNAL_CARD_IDS.length + 2),
          notFound: z.string().max(512).optional(),
        })
        .strict(),
      title: z.string().max(512).optional(),
      summary: z.string().max(2000).optional(),
      counts: z
        .array(
          z
            .object({
              tileId: z.enum(SIGNAL_CARD_IDS),
              title: z.string().max(256),
              description: z.string().max(512).optional(),
              value: z.number().int(),
              delta: z.number().int().optional(),
            })
            .strict()
        )
        .max(SIGNAL_CARD_IDS.length),
      // MAX_PRIORITIES in the producer is three.
      priorities: z
        .array(
          z
            .object({
              rank: z.number().int(),
              entityId: z.string().max(1024),
              name: z.string().max(1024),
              type: z.enum(['host', 'user', 'service', 'generic']),
              risk: z
                .object({
                  score: z.number(),
                  level: EntityRiskLevels,
                  of: z.enum(['entity', 'resolution group']),
                })
                .strict()
                .optional(),
              assetCriticality: z.string().max(128).optional(),
              watchlists: z.array(z.string().max(256)).max(64),
              firstSeen: z.string().max(128).optional(),
              assessment: z.string().max(2000),
              whyFirst: z.string().max(2000),
              nextStep: z.string().max(2000),
              riskHistory: riskHistorySchema.optional(),
            })
            .strict()
        )
        .max(3),
      recommendation: z.string().max(2000).optional(),
    })
    .strict()
);

export type BriefViewModel = z.infer<typeof BriefViewModel>;

export const formatBriefRepresentation = (brief: BriefViewModel): string => {
  const shownCounts = brief.counts.filter(({ value, delta }) => value > 0 || (delta ?? 0) !== 0);
  return [
    `Entity Analytics AI brief, captured ${brief.scope.capturedAt}`,
    `Scope: ${brief.scope.period} (last ${brief.scope.periodLabel}), space ${brief.scope.spaceId}`,
    brief.scope.focusTileTitle && `Attention tile: ${brief.scope.focusTileTitle}`,
    ...brief.scope.entityFilters.map(({ label, value }) => `${label}: ${value}`),
    brief.scope.sample && `Coverage: ${brief.scope.sample}`,
    brief.notChecked.notFound && `Not found: ${brief.notChecked.notFound}`,
    brief.notChecked.unreadable.length > 0 &&
      `Unavailable: ${brief.notChecked.unreadable.join(', ')}`,
    brief.title,
    brief.summary,
    `Counts compared with the previous ${brief.scope.periodLabel}:`,
    ...(shownCounts.length === 0
      ? ['No non-zero or changed counts are shown.']
      : shownCounts.map(({ title, value, delta }) => {
          const count = value === 0 ? '0 (shown as — in the brief)' : String(value);
          const comparison =
            delta === undefined
              ? 'no previous-period comparison was available'
              : delta === 0
              ? `no change from the previous ${brief.scope.periodLabel}`
              : `${delta > 0 ? '+' : ''}${delta} from the previous ${brief.scope.periodLabel}`;
          return `- ${title}: ${count}; ${comparison}`;
        })),
    ...brief.priorities.map((priority) => {
      const facts = [
        `Priority ${priority.rank}: ${priority.name} (${priority.entityId}, ${priority.type})`,
        priority.risk &&
          `Risk: ${priority.risk.level}, ${priority.risk.score} (${priority.risk.of})`,
        priority.assetCriticality && `Asset criticality: ${priority.assetCriticality}`,
        priority.firstSeen && `First seen: ${priority.firstSeen}`,
        priority.watchlists.length > 0 && `Watchlists: ${priority.watchlists.join(', ')}`,
        `Evidence: ${priority.assessment}`,
        `Why prioritized: ${priority.whyFirst}`,
        `Next step: ${priority.nextStep}`,
      ].filter((fact): fact is string => Boolean(fact));
      if (priority.riskHistory) {
        facts.push(
          `Risk history: ${priority.riskHistory.of}, ${priority.riskHistory.from} to ${priority.riskHistory.to}`,
          ...priority.riskHistory.points.map(({ t, score, level }) => `- ${t}: ${score} (${level})`)
        );
      }
      return facts.join('\n');
    }),
    brief.recommendation && `Recommended next step: ${brief.recommendation}`,
  ]
    .filter((line): line is string => Boolean(line))
    .join('\n');
};

export type EntityAnalyticsAiBriefResult = Attachment<
  typeof SecurityAgentBuilderAttachments.entityAnalyticsAiBriefResult,
  BriefViewModel
>;
