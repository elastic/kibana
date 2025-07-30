/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type SuperTest from 'supertest';
import type { ToolingLog } from '@kbn/tooling-log';
import {
  API_VERSIONS,
  ELASTIC_AI_ASSISTANT_EVALUATE_URL,
  GetEvaluateResponse,
} from '@kbn/elastic-assistant-common';
import { ELASTIC_HTTP_VERSION_HEADER } from '@kbn/core-http-common';
import { routeWithNamespace, waitFor } from '../../../../../common/utils/security_solution';

export const waitForEvaluationComplete = async ({
  evaluationId,
  supertest,
  log,
  timeout = 1_200_000, // 20min default
}: {
  evaluationId: string;
  supertest: SuperTest.Agent;
  log: ToolingLog;
  timeout?: number;
}) => {
  await waitFor(
    async () => {
      const route = routeWithNamespace(ELASTIC_AI_ASSISTANT_EVALUATE_URL);
      const { body, status } = await supertest
        .get(route)
        .set('kbn-xsrf', 'true')
        .set(ELASTIC_HTTP_VERSION_HEADER, API_VERSIONS.internal.v1);

      return (
        status === 200 &&
        (body as GetEvaluateResponse).results.some(
          (result) => result.id === evaluationId && result.status === 'complete'
        )
      );
    },
    'waitForEvaluationComplete',
    log,
    timeout,
    1000 // poll every 1s
  );
};
