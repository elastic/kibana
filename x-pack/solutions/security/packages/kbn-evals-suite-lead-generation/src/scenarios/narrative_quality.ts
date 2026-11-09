/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { bulkSeedEntities } from '../seeding/seed_entities';
import { seedAlert } from '../seeding/seed_alerts';
import { seedRiskScoreHistoryDoc } from '../seeding/seed_risk_score_history';
import { seedRelationshipObservation } from '../seeding/seed_relationship_metadata';
import { runLeadGeneration } from '../steps/run_lead_generation';
import { createLeadGenerationBasicEvaluator } from '../evaluators/lead_generation_basic_evaluator';
import { createLeadGenerationRubricEvaluator } from '../evaluators/lead_generation_rubric_evaluator';
import type { Scenario, ScenarioContext, StepResult } from '../types';

const NOW = Date.now();
const daysAgo = (days: number): string => new Date(NOW - days * 24 * 60 * 60 * 1000).toISOString();
const SIX_MONTHS_AGO = daysAgo(180);

// Escalating risk plus a multi-tactic alert burst, so the narrative has to
// integrate two distinct kinds of evidence rather than restating one metric.
const ESCALATING_USER_EUID = 'user:narrative-quality-escalating-privileged-user';

// Administers a critical-impact host, so the narrative has to explain concrete
// blast radius rather than describing the relationship in the abstract.
const CRITICAL_ASSET_HOST_EUID = 'host:narrative-quality-critical-asset-host';

const seedEscalatingUser = async (ctx: ScenarioContext): Promise<void> => {
  await bulkSeedEntities({
    esClient: ctx.esClient,
    entities: [
      {
        euid: ESCALATING_USER_EUID,
        type: 'user',
        firstSeen: SIX_MONTHS_AGO,
        managed: true,
        mfaEnabled: true,
        riskLevel: 'Critical',
        riskScoreNorm: 94,
        watchlists: ['privileged-user-monitoring-watchlist-id-default'],
        relationships: { administers: { ids: [CRITICAL_ASSET_HOST_EUID] } },
      },
      {
        euid: CRITICAL_ASSET_HOST_EUID,
        type: 'host',
        firstSeen: SIX_MONTHS_AGO,
        assetCriticality: 'extreme_impact',
      },
    ],
  });

  await Promise.all([
    seedRiskScoreHistoryDoc({
      esClient: ctx.esClient,
      euid: ESCALATING_USER_EUID,
      date: daysAgo(2),
      calculatedScoreNorm: 40,
      calculatedLevel: 'Moderate',
    }),
    seedRiskScoreHistoryDoc({
      esClient: ctx.esClient,
      euid: ESCALATING_USER_EUID,
      date: daysAgo(1),
      calculatedScoreNorm: 55,
      calculatedLevel: 'High',
    }),
    ...[
      { ruleName: 'Credential Dumping Attempt', severity: 'critical' as const },
      { ruleName: 'Unusual Process Execution', severity: 'critical' as const },
      { ruleName: 'Outbound Connection to Rare IP', severity: 'high' as const },
      { ruleName: 'Suspicious Scheduled Task Creation', severity: 'high' as const },
    ].map(({ ruleName, severity }) =>
      seedAlert({
        esClient: ctx.esClient,
        entityName: ESCALATING_USER_EUID.split(':').slice(1).join(':'),
        entityField: 'user.name',
        ruleName,
        severity,
        riskScore: 92,
      })
    ),
    seedRelationshipObservation({
      esClient: ctx.esClient,
      sourceEuid: ESCALATING_USER_EUID,
      targetEuid: CRITICAL_ASSET_HOST_EUID,
      kind: 'administers',
      observedAt: daysAgo(1),
    }),
  ]);
};

export const narrativeQualityScenario: Scenario = {
  name: 'narrative quality',
  description:
    'Seeds a privileged user with an escalating risk score, a 4-alert multi-tactic burst, and ' +
    'administration of a critical-impact host. Grades the resulting lead narrative with the LLM ' +
    'rubric evaluator to check that it integrates the evidence concretely rather than restating a ' +
    'single metric or the relationship in the abstract.',
  euids: [ESCALATING_USER_EUID, CRITICAL_ASSET_HOST_EUID],
  rubricCriteria:
    'The seeded user has three distinct kinds of evidence: an escalating risk score, a multi-tactic ' +
    'alert burst, and administration of a critical-impact host. A high-quality narrative integrates ' +
    'more than one of these concretely (e.g. naming the host, the alert pattern, or the score change) ' +
    'rather than restating a single field or describing the relationship without its consequence.',

  seed: seedEscalatingUser,

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
    }),
  ],
};
