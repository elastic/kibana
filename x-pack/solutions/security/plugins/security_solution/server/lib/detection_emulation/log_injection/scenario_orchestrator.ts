/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Scenario Orchestrator — Phase 3
 *
 * The high-level orchestrator that ties all phases together:
 *
 * 1. Takes a scenario definition (or generates one from prebuilt rules)
 * 2. Inverts rule queries → field constraints
 * 3. Assembles ECS documents (with causal chains)
 * 4. Generates background noise
 * 5. Injects everything into the emulation index
 * 6. Evaluates outcomes (quality scorer)
 * 7. Records ground truth
 *
 * This is the single entry point for running a detection emulation
 * scenario end-to-end.
 */

import type { ElasticsearchClient, Logger, SavedObjectsClientContract } from '@kbn/core/server';
import { v4 as uuidv4 } from 'uuid';
import type { Scenario } from './scenario_schema';
import { validateScenario } from './scenario_schema';
import { invertRuleQuery } from './query_inverter';
import type { InvertedRule } from './query_inverter';
import { assembleDocuments } from './document_assembler';
import type { AssembledDocument } from './document_assembler';
import { generateNoise } from './noise_generator';
import type { NoiseDocument } from './noise_generator';
import { executeLogInjection, EMULATION_INDEX_PREFIX } from './executor';
import { evaluateScenario } from './quality_evaluator';
import type { EvaluationResult } from './quality_evaluator';

// ─── Types ─────────────────────────────────────────────────────────────

export interface OrchestratorDeps {
  esClient: ElasticsearchClient;
  logger: Logger;
  savedObjectsClient: SavedObjectsClientContract;
}

export interface OrchestratorOptions {
  /** Space ID for index naming. */
  spaceId: string;
  /** Whether log injection feature flag is enabled. */
  logInjectionEnabled: boolean;
  /** Whether to run quality evaluation after injection. */
  evaluate?: boolean;
  /** Evaluation timeout (ms). */
  evaluationTimeoutMs?: number;
  /**
   * Optional rule preview validation deps. When provided, the orchestrator
   * runs rule preview (via the extracted `runRuleExecutors`) against the
   * emulation index after injection to validate documents would actually
   * trigger their target detection rules — without waiting for the real
   * detection engine schedule.
   */
  rulePreviewDeps?: {
    runRuleExecutors: (
      ruleType: any,
      params: any,
      deps: any
    ) => Promise<{ logs: any[]; isAborted: boolean }>;
    executorDepsFactory: () => any;
    createRuleTypeForParams: (ruleParams: any) => any;
  };
  /** Rule definitions to use (if not provided, will load from prebuilt rules). */
  ruleDefinitions?: Array<{
    id: string;
    name: string;
    type: string;
    language?: string;
    query?: string;
  }>;
}

export interface OrchestratorResult {
  scenarioId: string;
  scenarioFingerprint: string;
  /** Number of attack docs injected. */
  attackDocsInjected: number;
  /** Number of noise docs injected. */
  noiseDocsInjected: number;
  /** IDs of all injected documents. */
  injectedDocIds: string[];
  /** Which rules were targeted. */
  targetedRules: Array<{ ruleId: string; ruleName: string }>;
  /** Evaluation result (if evaluate=true). */
  evaluation?: EvaluationResult;
  /** Rule preview validation results (if rulePreviewDeps provided). */
  rulePreviewValidation?: {
    rulesValidated: number;
    rulesWithAlerts: number;
    previewLogs: Array<{ ruleId: string; logs: any[]; isAborted: boolean }>;
  };
  /** Errors encountered during orchestration. */
  errors: string[];
  /** Duration of the full orchestration (ms). */
  durationMs: number;
}

// ─── Core orchestrator ─────────────────────────────────────────────────

/**
 * Execute a detection emulation scenario end-to-end.
 */
export async function executeScenario(
  scenario: Scenario,
  deps: OrchestratorDeps,
  options: OrchestratorOptions
): Promise<OrchestratorResult> {
  const { esClient, logger } = deps;
  const startTime = Date.now();
  const errors: string[] = [];
  const scenarioFingerprint = uuidv4();

  logger.info(`[orchestrator] Executing scenario "${scenario.name}" (${scenario.id})`);

  // ── Step 1: Validate scenario ──────────────────────────────────
  try {
    validateScenario(scenario);
  } catch (err) {
    throw new Error(`Invalid scenario: ${err instanceof Error ? err.message : String(err)}`);
  }

  // ── Step 2: Resolve rule definitions ───────────────────────────
  const ruleDefinitions = options.ruleDefinitions ?? [];
  if (ruleDefinitions.length === 0) {
    errors.push('No rule definitions provided. Pass ruleDefinitions in options or integrate prebuilt rule loading.');
  }

  // ── Step 3: Invert rule queries ────────────────────────────────
  const invertedRules: InvertedRule[] = [];
  for (const ruleTarget of scenario.rules) {
    const ruleDef = ruleDefinitions.find((r) => r.id === ruleTarget.ruleId);
    if (!ruleDef) {
      errors.push(`Rule not found: ${ruleTarget.ruleId}`);
      continue;
    }
    try {
      const inverted = invertRuleQuery(ruleDef);
      invertedRules.push(inverted);
    } catch (err) {
      errors.push(`Failed to invert rule ${ruleTarget.ruleId}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // ── Step 4: Assemble attack documents ──────────────────────────
  const attackDocs: AssembledDocument[] = [];
  for (const inverted of invertedRules) {
    try {
      const docs = assembleDocuments(inverted, {
        scenarioId: scenario.id,
        scenarioFingerprint,
        hostId: scenario.host.id,
        hostName: scenario.host.name,
        userName: scenario.user.name,
        os: scenario.host.os,
      });
      attackDocs.push(...docs);
    } catch (err) {
      errors.push(`Failed to assemble docs for rule ${inverted.ruleId}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // ── Step 5: Generate noise documents ───────────────────────────
  let noiseDocs: NoiseDocument[] = [];
  if (scenario.noise.count > 0) {
    try {
      noiseDocs = generateNoise(scenario.id, scenarioFingerprint, {
        count: scenario.noise.count,
        baseTimestamp: attackDocs[0]?.['@timestamp'] ?? new Date().toISOString(),
        spreadMs: scenario.noise.spreadMs,
        hostId: scenario.host.id,
        hostName: scenario.host.name,
        os: scenario.host.os,
        includeRedHerrings: scenario.noise.includeRedHerrings,
      });
    } catch (err) {
      errors.push(`Failed to generate noise: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // ── Step 6: Inject all documents ───────────────────────────────
  const allDocs = [...attackDocs, ...noiseDocs];
  let injectedDocIds: string[] = [];

  if (allDocs.length > 0) {
    try {
      const result = await executeLogInjection(
        {
          scenarioId: scenario.id,
          docs: allDocs as any, // AssembledDocument extends EcsEmulationDocument shape
          spaceId: options.spaceId,
          logInjectionEnabled: options.logInjectionEnabled,
        },
        { esClient, logger }
      );
      injectedDocIds = result.injectedDocIds;
    } catch (err) {
      errors.push(`Failed to inject docs: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // ── Step 7: Evaluate (optional) ────────────────────────────────
  let evaluation: EvaluationResult | undefined;
  if (options.evaluate && injectedDocIds.length > 0) {
    try {
      const expectedAlerts: Record<string, number> = {};
      for (const rt of scenario.rules) {
        expectedAlerts[rt.ruleId] = rt.expectedAlerts;
      }

      evaluation = await evaluateScenario(
        {
          scenarioId: scenario.id,
          scenarioFingerprint,
          targetedRuleIds: scenario.rules.map((r) => r.ruleId),
          expectedAlerts,
          emulationIndex: `${EMULATION_INDEX_PREFIX}${options.spaceId}-*`,
          timeoutMs: options.evaluationTimeoutMs,
        },
        { esClient, logger }
      );
    } catch (err) {
      errors.push(`Evaluation failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  const durationMs = Date.now() - startTime;

  // ── Step 8: Rule preview validation (optional) ──────────────
  let rulePreviewValidation: OrchestratorResult['rulePreviewValidation'];
  if (options.rulePreviewDeps && injectedDocIds.length > 0) {
    const { runRuleExecutors, executorDepsFactory, createRuleTypeForParams } =
      options.rulePreviewDeps;
    const previewLogs: Array<{ ruleId: string; logs: any[]; isAborted: boolean }> = [];
    let rulesWithAlerts = 0;

    for (const ruleDef of ruleDefinitions) {
      try {
        const ruleType = createRuleTypeForParams(ruleDef);
        if (!ruleType) continue;

        const result = await runRuleExecutors(
          ruleType.alertType,
          ruleType.params,
          executorDepsFactory()
        );

        const hasAlerts = result.logs.some(
          (l: any) => l.errors.length === 0 && !result.isAborted
        );
        if (hasAlerts) rulesWithAlerts++;

        previewLogs.push({
          ruleId: ruleDef.id,
          logs: result.logs,
          isAborted: result.isAborted,
        });
      } catch (err) {
        errors.push(
          `Rule preview failed for ${ruleDef.id}: ${
            err instanceof Error ? err.message : String(err)
          }`
        );
      }
    }

    rulePreviewValidation = {
      rulesValidated: previewLogs.length,
      rulesWithAlerts,
      previewLogs,
    };

    logger.info(
      `[orchestrator] Rule preview validation: ${rulesWithAlerts}/${previewLogs.length} rules would fire`
    );
  }

  logger.info(
    `[orchestrator] Scenario "${scenario.name}" completed in ${durationMs}ms: ` +
    `${attackDocs.length} attack + ${noiseDocs.length} noise docs, ` +
    `${injectedDocIds.length} injected, ${errors.length} errors`
  );

  return {
    scenarioId: scenario.id,
    scenarioFingerprint,
    attackDocsInjected: attackDocs.length,
    noiseDocsInjected: noiseDocs.length,
    injectedDocIds,
    targetedRules: invertedRules.map((r) => ({ ruleId: r.ruleId, ruleName: r.ruleName })),
    evaluation,
    rulePreviewValidation,
    errors,
    durationMs,
  };
}

/**
 * Generate a scenario from a list of prebuilt rule IDs.
 *
 * Creates a scenario that targets the given rules with default
 * host/user configuration and moderate noise.
 */
export function generateScenarioFromRules(
  ruleIds: string[],
  options?: {
    name?: string;
    description?: string;
    host?: { id: string; name: string; os: 'windows' | 'linux' | 'macos' };
    user?: { name: string };
    noiseCount?: number;
  }
): Scenario {
  const id = uuidv4();
  return validateScenario({
    id,
    name: options?.name ?? `Auto-generated scenario for ${ruleIds.length} rules`,
    description: options?.description ?? `Automatically generated scenario targeting rules: ${ruleIds.join(', ')}`,
    techniqueIds: [], // Will be populated from rule metadata later
    host: options?.host ?? { id: 'emulation-host-1', name: 'DESKTOP-EMU01', os: 'windows' },
    user: options?.user ?? { name: 'emulation-user' },
    rules: ruleIds.map((ruleId) => ({ ruleId, expectedAlerts: 1 })),
    noise: { count: options?.noiseCount ?? 20 },
    tags: ['auto-generated'],
  });
}
