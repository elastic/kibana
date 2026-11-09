/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import type { Client as EsClient } from '@elastic/elasticsearch';
import { evaluate } from '../src/evaluate';
import { personaMatrixDataset } from '../src/datasets';
import { selectShard } from '../src/datasets/select_shard';
import {
  seedChrysalisAlerts,
  cleanupChrysalisAlerts,
  assertParityDataGate,
  seedProfile,
} from '../src/fixtures/chrysalis_seed';
import {
  seedPersonaMatrixTools,
  cleanupPersonaMatrixTools,
} from '../src/fixtures/persona_matrix_tools_seed';
import { ensureEntityStoreRunning, examplesNeedEntityStore } from '../src/fixtures/entity_store';
import { assertPersonaMatrixToolsRegistered } from '../src/fixtures/tool_registration_check';
import { agentProfile, resolveAgentId } from '../src/agent_profile';

const DATASET_NAME = 'security: security-persona-matrix';
const DATASET_DESCRIPTION =
  'Breadth-first persona matrix: 21 prompts across 7 security skill categories.';

const examplesFilter = process.env.EVAL_EXAMPLES?.split(',')
  .map((id) => id.trim())
  .filter(Boolean);
const examples = examplesFilter
  ? personaMatrixDataset.filter((ex) => examplesFilter.includes(ex.id))
  : personaMatrixDataset;
// EVAL_EXAMPLES and the shard slice (re-applied inside evaluateDataset) both narrow what runs.
const selectRunExamples = () => selectShard(examples, process.env.PERSONA_MATRIX_SHARD);

evaluate.describe('Security Persona Matrix', { tag: tags.stateful.classic }, () => {
  evaluate.beforeAll(async ({ esClient, kbnClient, log }) => {
    if (agentProfile === 'chrysalis-parity' && seedProfile !== 'parity') {
      throw new Error('AGENT_PROFILE=chrysalis-parity requires SEED_PROFILE=parity');
    }
    await seedChrysalisAlerts({ esClient: esClient as unknown as EsClient, log, count: 3 });
    log.info('[persona-matrix] seeded Chrysalis alerts');
    if (seedProfile === 'parity') {
      await assertParityDataGate({ esClient: esClient as unknown as EsClient, log });
    }
    // Entity-analytics examples expect security.get_entity* built-in tools, which
    // are availability-gated on the entity store being installed; nothing installs
    // it on a fresh stack, so do it here. The gate only checks that the store's index
    // exists, so a store that installed but did not start still passes the tool
    // pre-flight: fail the run when an example that will execute needs entity tools,
    // and only warn for an EVAL_EXAMPLES subset or shard without them.
    try {
      await ensureEntityStoreRunning({ kbnClient, log });
    } catch (error) {
      if (examplesNeedEntityStore(selectRunExamples())) {
        throw error;
      }
      log.warning(
        `[persona-matrix] entity store not running; no selected example needs entity tools: ${error}`
      );
    }
    await seedPersonaMatrixTools({ kbnClient, log, profile: agentProfile });
    log.info(
      `[persona-matrix] seeded persona-matrix tools (seed profile: ${seedProfile}, agent: ${resolveAgentId(
        agentProfile
      )})`
    );
  });

  evaluate.afterAll(async ({ esClient, kbnClient, log }) => {
    await cleanupChrysalisAlerts({ esClient: esClient as unknown as EsClient, log });
    await cleanupPersonaMatrixTools({ kbnClient, log });
  });

  evaluate('all 21 examples', async ({ evaluateDataset, kbnClient, log }) => {
    if (examples.length === 0) {
      throw new Error(`EVAL_EXAMPLES matched no examples: ${examplesFilter?.join(',')}`);
    }

    log.info(
      `Running persona matrix evaluation with ${examples.length} examples${
        examplesFilter ? ` (filtered: ${examplesFilter.join(',')})` : ''
      }`
    );

    // Pre-flight: fail fast if an expected custom tool isn't registered, rather
    // than silently scoring a tool that doesn't exist.
    // Only require the tools of examples this run will execute.
    await assertPersonaMatrixToolsRegistered({
      kbnClient,
      log,
      examples: selectRunExamples(),
      agentId: resolveAgentId(agentProfile),
      profile: agentProfile,
    });

    await evaluateDataset({
      dataset: {
        name: DATASET_NAME,
        description: DATASET_DESCRIPTION,
        examples,
      },
    });

    log.info('Persona matrix evaluation complete');
  });
});
