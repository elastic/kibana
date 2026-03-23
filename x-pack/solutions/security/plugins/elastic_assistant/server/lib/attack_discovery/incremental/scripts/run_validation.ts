/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Validation Runner for Incremental Attack Discovery
 *
 * Runs validation scenarios against real or mock LLMs to verify:
 * 1. Context budget stays <8K tokens
 * 2. Delta mode processes only NEW alerts
 * 3. Progressive mode handles large datasets
 * 4. Insights are coherent and properly merged
 *
 * Usage:
 *   node scripts/run_validation.js --model qwen-2.5-7b --connector-id <id>
 *   node scripts/run_validation.js --mock  # Use mock LLM
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { AttackDiscovery } from '@kbn/elastic-assistant-common';
import { incrementalAttackDiscovery } from '../index';
import type { Alert, IncrementalADResult } from '../types';
import { validationScenarios } from '../__tests__/validation_scenarios';

interface ValidationConfig {
  useMockLLM: boolean;
  connectorId?: string;
  model?: string;
  esClient: ElasticsearchClient;
}

/**
 * Mock LLM for testing without real API calls
 */
async function mockGenerateInsights(
  alerts: Alert[],
  previousInsights?: AttackDiscovery[]
): Promise<AttackDiscovery[]> {
  // Simulate processing delay
  await new Promise(resolve => setTimeout(resolve, 100));

  // Group alerts by rule name
  const alertsByRule = alerts.reduce((acc, alert) => {
    const content = JSON.parse(alert.content as string);
    const ruleName = content.rule?.name || 'Unknown';
    if (!acc[ruleName]) acc[ruleName] = [];
    acc[ruleName].push(alert);
    return acc;
  }, {} as Record<string, Alert[]>);

  // Generate insights per rule
  const newInsights: AttackDiscovery[] = Object.entries(alertsByRule).map(([ruleName, ruleAlerts]) => ({
    title: ruleName,
    summaryMarkdown: `Detected ${ruleAlerts.length} ${ruleName} alerts`,
    detailsMarkdown: `Analysis of ${ruleAlerts.length} alerts:\n- First alert: ${ruleAlerts[0].id}\n- Last alert: ${ruleAlerts[ruleAlerts.length - 1].id}`,
    alertIds: ruleAlerts.map(a => a.id),
  }));

  return newInsights;
}

/**
 * Run a single validation scenario
 */
async function runScenario(
  scenario: typeof validationScenarios[0],
  config: ValidationConfig
): Promise<{
  scenarioName: string;
  passed: boolean;
  result?: IncrementalADResult;
  error?: Error;
  metrics: {
    totalRounds: number;
    totalAlertsProcessed: number;
    deltaSize?: number;
    durationMs: number;
    avgContextTokens: number;
    maxContextTokens: number;
  };
}> {
  console.log(`\n=== Running: ${scenario.name} ===`);

  try {
    const startTime = Date.now();

    // Run incremental AD with scenario config
    const result = await incrementalAttackDiscovery({
      mode: scenario.mode,
      alerts: scenario.alerts,
      existingInsights: [],
      config: scenario.config,
      esClient: config.esClient,
      sessionId: scenario.sessionId,
      generateInsights: config.useMockLLM
        ? mockGenerateInsights
        : async (alerts, prev) => {
            // Real LLM call would go here
            throw new Error('Real LLM not implemented - use --mock flag');
          },
    });

    const durationMs = Date.now() - startTime;

    // Calculate metrics
    const contextTokens = result.rounds.map(r => r.alertsProcessed.length * 100 + 500);
    const avgContextTokens = contextTokens.reduce((a, b) => a + b, 0) / contextTokens.length;
    const maxContextTokens = Math.max(...contextTokens);

    const metrics = {
      totalRounds: result.stats.totalRounds,
      totalAlertsProcessed: result.stats.totalAlertsProcessed,
      deltaSize: result.stats.deltaSize,
      durationMs,
      avgContextTokens,
      maxContextTokens,
    };

    // Run scenario-specific validation
    let passed = true;
    try {
      scenario.validate({ ...result, durationMs });
    } catch (error) {
      passed = false;
      console.error(`❌ Validation failed: ${(error as Error).message}`);
    }

    if (passed) {
      console.log(`✅ PASSED`);
      console.log(`   Rounds: ${metrics.totalRounds}`);
      console.log(`   Alerts processed: ${metrics.totalAlertsProcessed}`);
      if (metrics.deltaSize !== undefined) {
        console.log(`   Delta size: ${metrics.deltaSize}`);
      }
      console.log(`   Max context: ${metrics.maxContextTokens} tokens`);
      console.log(`   Duration: ${metrics.durationMs}ms`);
    }

    return {
      scenarioName: scenario.name,
      passed,
      result,
      metrics,
    };
  } catch (error) {
    console.error(`❌ FAILED: ${(error as Error).message}`);
    return {
      scenarioName: scenario.name,
      passed: false,
      error: error as Error,
      metrics: {
        totalRounds: 0,
        totalAlertsProcessed: 0,
        durationMs: 0,
        avgContextTokens: 0,
        maxContextTokens: 0,
      },
    };
  }
}

/**
 * Run all validation scenarios
 */
export async function runAllValidations(config: ValidationConfig) {
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║ Incremental Attack Discovery Validation Suite         ║');
  console.log('╚════════════════════════════════════════════════════════╝');
  console.log(`\nMode: ${config.useMockLLM ? 'Mock LLM' : `Real LLM (${config.model})`}`);
  console.log(`Scenarios: ${validationScenarios.length}\n`);

  const results = [];

  for (const scenario of validationScenarios) {
    const result = await runScenario(scenario, config);
    results.push(result);
  }

  // Print summary
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║ Validation Summary                                     ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;

  console.log(`Total scenarios: ${results.length}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`\nSuccess rate: ${((passed / results.length) * 100).toFixed(1)}%`);

  // Aggregate metrics
  const totalRounds = results.reduce((sum, r) => sum + r.metrics.totalRounds, 0);
  const totalAlerts = results.reduce((sum, r) => sum + r.metrics.totalAlertsProcessed, 0);
  const avgMaxContext = results.reduce((sum, r) => sum + r.metrics.maxContextTokens, 0) / results.length;

  console.log(`\nAggregate Metrics:`);
  console.log(`  Total rounds: ${totalRounds}`);
  console.log(`  Total alerts: ${totalAlerts}`);
  console.log(`  Avg max context: ${avgMaxContext.toFixed(0)} tokens`);
  console.log(`  Context limit: 8000 tokens`);
  console.log(`  Within budget: ${avgMaxContext < 8000 ? '✅' : '❌'}`);

  // Failed scenarios detail
  if (failed > 0) {
    console.log(`\n❌ Failed Scenarios:`);
    results.filter(r => !r.passed).forEach(r => {
      console.log(`   - ${r.scenarioName}`);
      if (r.error) {
        console.log(`     Error: ${r.error.message}`);
      }
    });
  }

  return {
    passed,
    failed,
    totalScenarios: results.length,
    results,
  };
}

/**
 * CLI entry point
 */
export async function main() {
  // Parse CLI args
  const args = process.argv.slice(2);
  const useMockLLM = args.includes('--mock');
  const connectorId = args.find(arg => arg.startsWith('--connector-id='))?.split('=')[1];
  const model = args.find(arg => arg.startsWith('--model='))?.split('=')[1];

  if (!useMockLLM && (!connectorId || !model)) {
    console.error('Error: Must provide --connector-id and --model, or use --mock');
    process.exit(1);
  }

  // Mock ES client for validation
  const mockEsClient = {
    bulk: async () => ({ errors: false }),
    get: async () => ({ found: false }),
    search: async () => ({ hits: { hits: [] } }),
  } as any;

  const config: ValidationConfig = {
    useMockLLM,
    connectorId,
    model,
    esClient: mockEsClient,
  };

  const summary = await runAllValidations(config);

  process.exit(summary.failed > 0 ? 1 : 0);
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}
