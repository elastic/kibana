/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/evals';
import { evaluate } from '../src/evaluate';

evaluate.describe(
  'Threat Intelligence hunt: technique extraction',
  { tag: tags.stateful.classic },
  () => {
    // The `hunt_behavior` route resolves its LLM from `genAi:defaultAIConnector`
    // (it does not accept a per-request connector override). The base fixture
    // creates/selects one connector per project (per model), so we point the
    // default-connector setting at it here — this is what makes the run a
    // per-model scorecard: swap the project's connector, get that model scored.
    evaluate.beforeAll(async ({ kbnClient, connector, log }) => {
      log.info(`Setting genAi:defaultAIConnector to '${connector.id}' for hunt_behavior`);
      await kbnClient.uiSettings.update({ 'genAi:defaultAIConnector': connector.id });
    });

    evaluate('technique extraction scorecard', async ({ evaluateDataset }) => {
      await evaluateDataset();
    });
  }
);
