/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { take } from 'lodash';
import { ApmApiSupertest } from '../../common/apm_api_supertest';

export async function getErrorGroupIds({
  apmApiSupertest,
  start,
  end,
  serviceName = 'opbeans-java',
  count = 5,
}: {
  apmApiSupertest: ApmApiSupertest;
  start: string;
  end: string;
  serviceName?: string;
  count?: number;
}) {
  const { body } = await apmApiSupertest({
    endpoint: `GET /api/apm/services/{serviceName}/error_groups/main_statistics`,
    params: {
      path: { serviceName },
      query: {
        start,
        end,
        transactionType: 'request',
        environment: 'ENVIRONMENT_ALL',
        kuery: '',
      },
    },
  });

  return take(body.error_groups.map((group) => group.group_id).sort(), count);
}
