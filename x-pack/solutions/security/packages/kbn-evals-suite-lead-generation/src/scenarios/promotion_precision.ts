/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { bulkSeedEntities, type SeedEntityOptions } from '../seeding/seed_entities';
import { seedRelationshipObservation } from '../seeding/seed_relationship_metadata';
import { runLeadGeneration } from '../steps/run_lead_generation';
import { createLeadGenerationBasicEvaluator } from '../evaluators/lead_generation_basic_evaluator';
import { createLeadGenerationRubricEvaluator } from '../evaluators/lead_generation_rubric_evaluator';
import type { Lead, Scenario, ScenarioContext, StepResult, ScenarioTaskOutput } from '../types';

const POOL_SIZE = 150;
const EARLY_POSITION_WINDOW = 20;

const NOW = Date.now();
const daysAgo = (days: number): string => new Date(NOW - days * 24 * 60 * 60 * 1000).toISOString();
const SIX_MONTHS_AGO = daysAgo(180);
const RECENTLY = daysAgo(2);

// Ten entities with an overwhelming, single-module risk signal.
// This reliably saturates their risk priority to the 1-10 scale's maximum,
// so they occupy the confident top 10 regardless of anything below — leaving
// the should-promotes and distractors to compete for a place in the
// *exploratory* pool instead, which is what this scenario is actually about:
// the LLM's promotion judgment, not deterministic ranking.
const CONFIDENT_FILLER_COUNT = 10;
const confidentFillerEuid = (index: number): string => `user:promotion-precision-filler-${index}`;
const CONFIDENT_FILLER_EUIDS = Array.from({ length: CONFIDENT_FILLER_COUNT }, (_, i) =>
  confidentFillerEuid(i)
);

// Each combines two signals the exploratory-promotion prompt calls out by
// name as hunt-worthy: newly-observed/governance-gap attributes together with
// an interesting relationship (or with each other). Weak enough individually
// to rank below the filler entities, but a genuine combination.
const SHOULD_PROMOTE_EUIDS = [
  'user:promotion-precision-should-promote-newly-observed-governance-gap',
  'user:promotion-precision-should-promote-newly-observed-new-control',
  'user:promotion-precision-should-promote-governance-gap-sensitive-access',
] as const;

// Each has exactly one generic fact and nothing else — the exploratory
// prompt's own rule is that "a single attribute or a generic 'unusual'
// observation is not enough", so a correct promotion decision excludes all of these.
const DISTRACTOR_EUIDS = [
  'user:promotion-precision-distractor-governance-gap-alone',
  'user:promotion-precision-distractor-newly-observed-alone',
  'user:promotion-precision-distractor-connected-to-risk-alone',
  'user:promotion-precision-distractor-infrequent-access-alone',
  'user:promotion-precision-distractor-new-control-alone',
] as const;

// Peers/hosts referenced by the should-promotes' and distractors' relationships.
const RISKY_PEER_EUID = 'user:promotion-precision-risky-peer';
const NEW_CONTROL_HOST_PROMOTE_EUID = 'host:promotion-precision-new-control-host-promote';
const SENSITIVE_ACCESS_HOST_PROMOTE_EUID = 'host:promotion-precision-sensitive-access-host-promote';
const INFREQUENT_ACCESS_HOST_DISTRACTOR_EUID = 'host:promotion-precision-infrequent-access-host';
const NEW_CONTROL_HOST_DISTRACTOR_EUID = 'host:promotion-precision-new-control-host-distractor';

// Each has one weak, generic "newly observed" fact — enough to qualify as an
// exploratory candidate (so the pool is a realistic size, not just the 8
// entities under test) but not a combination, so none should be promoted.
const backgroundEuid = (index: number): string => `user:promotion-precision-background-${index}`;
const BACKGROUND_COUNT =
  POOL_SIZE -
  CONFIDENT_FILLER_COUNT -
  SHOULD_PROMOTE_EUIDS.length -
  DISTRACTOR_EUIDS.length -
  5; /* peer + 4 hosts */
const BACKGROUND_EUIDS = Array.from({ length: BACKGROUND_COUNT }, (_, i) => backgroundEuid(i));

/**
 * The order the exploratory-eligible entities are seeded in, used only to
 * check for positional bias in which EUIDs get promoted (see
 * `PromotionPositionBias` below). This is an approximation of prompt order,
 * since the pipeline's own internal pool ordering isn't observable from here.
 * Deliberately excludes the confident filler, which never enters the
 * exploratory pool.
 */
const EXPLORATORY_POOL_ORDER = [
  ...BACKGROUND_EUIDS,
  ...SHOULD_PROMOTE_EUIDS,
  ...DISTRACTOR_EUIDS,
  RISKY_PEER_EUID,
];

const ALL_EUIDS = [
  ...CONFIDENT_FILLER_EUIDS,
  ...EXPLORATORY_POOL_ORDER,
  NEW_CONTROL_HOST_PROMOTE_EUID,
  SENSITIVE_ACCESS_HOST_PROMOTE_EUID,
  INFREQUENT_ACCESS_HOST_DISTRACTOR_EUID,
  NEW_CONTROL_HOST_DISTRACTOR_EUID,
];

const establishedOptions = (euid: string): SeedEntityOptions => ({
  euid,
  type: 'user',
  firstSeen: SIX_MONTHS_AGO,
  managed: true,
  mfaEnabled: true,
});

const backgroundOptions = (euid: string): SeedEntityOptions => ({
  euid,
  type: 'user',
  firstSeen: RECENTLY,
  managed: true,
  mfaEnabled: true,
});

const seedPool = async (ctx: ScenarioContext): Promise<void> => {
  await bulkSeedEntities({
    esClient: ctx.esClient,
    entities: [
      ...CONFIDENT_FILLER_EUIDS.map(
        (euid): SeedEntityOptions => ({
          euid,
          type: 'user',
          firstSeen: SIX_MONTHS_AGO,
          managed: true,
          mfaEnabled: true,
          riskLevel: 'Critical',
          riskScoreNorm: 95,
          watchlists: ['privileged-user-monitoring-watchlist-id-default'],
        })
      ),
      // Newly observed + governance gap (unmanaged, no MFA, privileged) — a
      // single-module combination the promotion prompt names explicitly.
      {
        euid: SHOULD_PROMOTE_EUIDS[0],
        type: 'user',
        firstSeen: RECENTLY,
        managed: false,
        mfaEnabled: false,
        watchlists: ['privileged-user-monitoring-watchlist-id-default'],
      },
      // Newly observed + privileged, plus a relationship: recently gained
      // control over a critical-impact host. `relationships` is set directly
      // (rather than relying solely on `seedRelationshipObservation` below)
      // because `attach_related_entities`/`relationship_module` read
      // `entity.relationships.<kind>.ids` straight off this latest-index doc —
      // that field is never derived from the relationship-observed metadata
      // event on its own.
      {
        euid: SHOULD_PROMOTE_EUIDS[1],
        type: 'user',
        firstSeen: RECENTLY,
        managed: true,
        mfaEnabled: true,
        watchlists: ['privileged-user-monitoring-watchlist-id-default'],
        relationships: { administers: { ids: [NEW_CONTROL_HOST_PROMOTE_EUID] } },
      },
      // Established but with a governance gap (unmanaged, no MFA, privileged),
      // plus a relationship: infrequently accesses a critical-impact host.
      {
        euid: SHOULD_PROMOTE_EUIDS[2],
        type: 'user',
        firstSeen: SIX_MONTHS_AGO,
        managed: false,
        mfaEnabled: false,
        watchlists: ['privileged-user-monitoring-watchlist-id-default'],
        relationships: { accesses_infrequently: { ids: [SENSITIVE_ACCESS_HOST_PROMOTE_EUID] } },
      },
      // Established, otherwise unremarkable, with a governance gap and no
      // other signal.
      {
        euid: DISTRACTOR_EUIDS[0],
        type: 'user',
        firstSeen: SIX_MONTHS_AGO,
        managed: false,
        mfaEnabled: false,
        watchlists: ['privileged-user-monitoring-watchlist-id-default'],
      },
      // Newly observed, otherwise unremarkable (not privileged), with no
      // other signal.
      backgroundOptions(DISTRACTOR_EUIDS[1]),
      // Established, otherwise unremarkable, communicates with a high-risk peer.
      {
        ...establishedOptions(DISTRACTOR_EUIDS[2]),
        relationships: { communicates_with: { ids: [RISKY_PEER_EUID] } },
      },
      // Established, otherwise unremarkable, infrequently accesses a
      // critical-impact host.
      {
        ...establishedOptions(DISTRACTOR_EUIDS[3]),
        relationships: {
          accesses_infrequently: { ids: [INFREQUENT_ACCESS_HOST_DISTRACTOR_EUID] },
        },
      },
      // Established, otherwise unremarkable, recently gained control over a
      // critical-impact host.
      {
        ...establishedOptions(DISTRACTOR_EUIDS[4]),
        relationships: { administers: { ids: [NEW_CONTROL_HOST_DISTRACTOR_EUID] } },
      },
      {
        euid: RISKY_PEER_EUID,
        type: 'user',
        firstSeen: SIX_MONTHS_AGO,
        managed: true,
        mfaEnabled: true,
        riskLevel: 'High',
        riskScoreNorm: 78,
      },
      {
        euid: NEW_CONTROL_HOST_PROMOTE_EUID,
        type: 'host',
        firstSeen: SIX_MONTHS_AGO,
        assetCriticality: 'extreme_impact',
      },
      {
        euid: SENSITIVE_ACCESS_HOST_PROMOTE_EUID,
        type: 'host',
        firstSeen: SIX_MONTHS_AGO,
        assetCriticality: 'extreme_impact',
      },
      {
        euid: INFREQUENT_ACCESS_HOST_DISTRACTOR_EUID,
        type: 'host',
        firstSeen: SIX_MONTHS_AGO,
        assetCriticality: 'extreme_impact',
      },
      {
        euid: NEW_CONTROL_HOST_DISTRACTOR_EUID,
        type: 'host',
        firstSeen: SIX_MONTHS_AGO,
        assetCriticality: 'extreme_impact',
      },
      ...BACKGROUND_EUIDS.map(backgroundOptions),
    ],
  });

  await Promise.all([
    seedRelationshipObservation({
      esClient: ctx.esClient,
      sourceEuid: SHOULD_PROMOTE_EUIDS[1],
      targetEuid: NEW_CONTROL_HOST_PROMOTE_EUID,
      kind: 'administers',
      observedAt: daysAgo(1),
    }),
    seedRelationshipObservation({
      esClient: ctx.esClient,
      sourceEuid: SHOULD_PROMOTE_EUIDS[2],
      targetEuid: SENSITIVE_ACCESS_HOST_PROMOTE_EUID,
      kind: 'accesses_infrequently',
      observedAt: daysAgo(1),
    }),
    seedRelationshipObservation({
      esClient: ctx.esClient,
      sourceEuid: DISTRACTOR_EUIDS[2],
      targetEuid: RISKY_PEER_EUID,
      kind: 'communicates_with',
      observedAt: daysAgo(1),
    }),
    seedRelationshipObservation({
      esClient: ctx.esClient,
      sourceEuid: DISTRACTOR_EUIDS[3],
      targetEuid: INFREQUENT_ACCESS_HOST_DISTRACTOR_EUID,
      kind: 'accesses_infrequently',
      observedAt: daysAgo(1),
    }),
    seedRelationshipObservation({
      esClient: ctx.esClient,
      sourceEuid: DISTRACTOR_EUIDS[4],
      targetEuid: NEW_CONTROL_HOST_DISTRACTOR_EUID,
      kind: 'administers',
      observedAt: daysAgo(1),
    }),
  ]);
};

const exploratoryLeads = (leads: Lead[]): Lead[] => leads.filter((l) => l.origin === 'exploratory');
const euidsOf = (leads: Lead[]): string[] => leads.map((l) => l.entity.id);

const SHOULD_PROMOTE_EUID_SET: ReadonlySet<string> = new Set(SHOULD_PROMOTE_EUIDS);
const DISTRACTOR_EUID_SET: ReadonlySet<string> = new Set(DISTRACTOR_EUIDS);

export const promotionPrecisionScenario: Scenario = {
  name: 'promotion precision',
  description:
    `Seeds ${CONFIDENT_FILLER_COUNT} entities with an overwhelming risk signal (guaranteed confident ` +
    `leads, occupying the top 10 slots), ${SHOULD_PROMOTE_EUIDS.length} exploratory candidates with a ` +
    `genuine combination of hunt-worthy signals, ${DISTRACTOR_EUIDS.length} exploratory candidates ` +
    'with only a single generic fact, and quiet background filler to make the exploratory pool a ' +
    "realistic size. Measures the LLM exploratory-promotion call's precision/recall and positional " +
    'bias, and grades the resulting promoted-lead narratives.',
  euids: ALL_EUIDS,
  rubricCriteria:
    "The graded leads were promoted from the exploratory pool, so each entity's narrative should " +
    'ground itself in the specific combination of facts (attributes, observations, or relationships) ' +
    'that made it hunt-worthy, and may reference why it was promoted, rather than restating a single ' +
    'fact in isolation or the promotion reason verbatim. Treat any specific fact, count, or ' +
    'relationship named in the title, byline, or description as fabricated unless it also appears in ' +
    "that same lead's own observations or topRelatedEntities fields in the submission — do not accept " +
    'a claim solely because it sounds plausible or matches the general theme.',

  seed: seedPool,

  run: async (ctx: ScenarioContext): Promise<StepResult[]> => {
    const result = await runLeadGeneration({
      leadGenerationClient: ctx.leadGenerationClient,
      connectorId: ctx.connectorId,
      log: ctx.log,
    });
    return [{ label: 'initial run', leads: result.leads ?? [], errors: result.errors }];
  },

  evaluators: (ctx) => [
    createLeadGenerationBasicEvaluator(),
    createLeadGenerationRubricEvaluator({
      inferenceClient: ctx.evaluationInferenceClient,
      log: ctx.log,
      selectLeads: exploratoryLeads,
    }),
    {
      name: 'ExploratoryPromotionPrecisionAndRecall',
      kind: 'CODE',
      direction: 'maximize',
      evaluate: async ({ output }) => {
        const promoted = euidsOf(exploratoryLeads(latestLeads(output)));

        // Anything promoted that isn't a should-promote is wrong — whether
        // it's a named single-fact distractor, quiet background filler, or
        // the risky peer (itself just a single generic risk fact once it
        // qualifies as a candidate).
        const promotedShouldPromotes = SHOULD_PROMOTE_EUIDS.filter((euid) =>
          promoted.includes(euid)
        ).length;
        const falsePositives = promoted.filter((euid) => !SHOULD_PROMOTE_EUID_SET.has(euid));
        const namedDistractorFalsePositives = falsePositives.filter((euid) =>
          DISTRACTOR_EUID_SET.has(euid)
        ).length;

        const recall = promotedShouldPromotes / SHOULD_PROMOTE_EUIDS.length;
        const precisionDenom = promotedShouldPromotes + falsePositives.length;
        const precision = precisionDenom === 0 ? 0 : promotedShouldPromotes / precisionDenom;

        const passed = recall === 1 && falsePositives.length === 0;
        return {
          score: passed ? 1 : 0,
          label: passed ? 'correct_promotion_set' : 'incorrect_promotion_set',
          explanation:
            `recall=${recall.toFixed(2)} (${promotedShouldPromotes}/${
              SHOULD_PROMOTE_EUIDS.length
            }), ` +
            `precision=${precision.toFixed(2)}, false positives=${falsePositives.length} ` +
            `(${namedDistractorFalsePositives} named single-fact distractors, ` +
            `${falsePositives.length - namedDistractorFalsePositives} other).`,
        };
      },
    },
    {
      // Informational, not a pass/fail gate: reports whether exploratory
      // promotions cluster near the front of the seeded pool order, which
      // would suggest the model is weighting prompt position rather than
      // judging content.
      name: 'PromotionPositionBias',
      kind: 'CODE',
      direction: 'neutral',
      evaluate: async ({ output }) => {
        const promoted = euidsOf(exploratoryLeads(latestLeads(output)));
        const positions = promoted
          .map((euid) => EXPLORATORY_POOL_ORDER.indexOf(euid))
          .filter((index) => index !== -1);

        if (positions.length === 0) {
          return { score: 1, label: 'no_promotions_to_assess' };
        }

        const earlyCount = positions.filter((index) => index < EARLY_POSITION_WINDOW).length;
        const earlyFraction = earlyCount / positions.length;
        const expectedEarlyFraction = EARLY_POSITION_WINDOW / EXPLORATORY_POOL_ORDER.length;
        const biasDetected = earlyFraction > expectedEarlyFraction * 2;

        return {
          score: 1,
          label: biasDetected ? 'position_bias_detected' : 'no_position_bias_detected',
          explanation:
            `${earlyCount}/${positions.length} exploratory promotions fell within the first ` +
            `${EARLY_POSITION_WINDOW} seed positions (expected ~${(
              expectedEarlyFraction * 100
            ).toFixed(1)}% under uniform selection, observed ${(earlyFraction * 100).toFixed(
              1
            )}%).`,
        };
      },
    },
  ],
};

const latestLeads = (output: unknown): Lead[] =>
  (output as ScenarioTaskOutput | undefined)?.steps.at(-1)?.leads ?? [];
