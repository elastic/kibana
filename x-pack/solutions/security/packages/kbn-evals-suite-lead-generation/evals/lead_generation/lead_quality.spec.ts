/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { evaluate } from '../../src/evaluate';
import { runScenario } from '../../src/scenario_runner';
import { SCENARIOS } from '../../src/scenarios';
import type { ScenarioContext } from '../../src/types';

/**
 * Answers "are the leads good?" — as opposed to `smoke.spec.ts`, which only answers
 * "does it work?". Each scenario seeds known entities, runs the full pipeline,
 * asserts the quality of the leads, and tears down its seeded data
 */
evaluate.describe('Lead Generation Quality', { tag: tags.stateful.classic }, () => {
  for (const scenario of SCENARIOS) {
    evaluate(
      scenario.name,
      async ({
        executorClient,
        leadGenerationClient,
        connector,
        evaluationConnector,
        inferenceClient,
        kbnClient,
        esClient,
        log,
      }) => {
        const ctx: ScenarioContext = {
          esClient,
          kbnClient,
          leadGenerationClient,
          connectorId: connector.id,
          evaluationInferenceClient: inferenceClient.bindTo({
            connectorId: evaluationConnector.id,
          }),
          log,
          prefix: scenario.name.replace(/\s+/g, '-'),
        };

        await runScenario({ scenario, ctx, executorClient });
      }
    );
  }
});
