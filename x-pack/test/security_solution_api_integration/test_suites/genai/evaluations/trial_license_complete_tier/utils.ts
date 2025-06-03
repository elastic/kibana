/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type SuperTest from 'supertest';
import type { ToolingLog } from '@kbn/tooling-log';
import {
  ELASTIC_AI_ASSISTANT_EVALUATE_URL,
  GetEvaluateResponse,
} from '@kbn/elastic-assistant-common';
import { routeWithNamespace, waitFor } from '../../../../../common/utils/security_solution';

export const waitForEvaluationComplete = async ({
  evaluationId,
  supertest,
  log,
}: {
  evaluationId: string;
  supertest: SuperTest.Agent;
  log: ToolingLog;
}) => {
  await waitFor(
    async () => {
      const route = routeWithNamespace(ELASTIC_AI_ASSISTANT_EVALUATE_URL);
      const { body, status } = await supertest.get(route);

      return (
        status === 200 &&
        (body as GetEvaluateResponse).results.some(
          (result) => result.id === evaluationId && result.status === 'complete'
        )
      );
    },
    'waitForEvaluationComplete',
    log,
    20 * 60 * 1000, // wait for up to 20m -- evals can take a long time!
    1000 // poll every 1s
  );
};
