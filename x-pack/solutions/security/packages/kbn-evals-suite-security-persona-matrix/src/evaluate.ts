/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { evaluate as base } from '@kbn/evals';
import type { EvaluationDataset } from '@kbn/evals';
import { PersonaMatrixChatClient } from './chat_client';
import { createEvaluatePersonaMatrixDataset } from './evaluate_dataset';
import type { PersonaMatrixExample } from './datasets/persona_matrix_prompts';

export type EvaluatePersonaMatrixDataset = (params: {
  dataset: EvaluationDataset<PersonaMatrixExample>;
}) => Promise<void>;

export const evaluate = base.extend<
  {},
  {
    chatClient: PersonaMatrixChatClient;
    evaluateDataset: EvaluatePersonaMatrixDataset;
  }
>({
  chatClient: [
    async ({ fetch, log, connector }, use) => {
      await use(new PersonaMatrixChatClient(fetch, log, connector.id));
    },
    { scope: 'worker' },
  ],
  evaluateDataset: [
    ({ chatClient, evaluators, executorClient, traceEsClient, log }, use) => {
      use(
        createEvaluatePersonaMatrixDataset({
          chatClient,
          evaluators,
          executorClient,
          traceEsClient,
          log,
        })
      );
    },
    { scope: 'worker' },
  ],
});
