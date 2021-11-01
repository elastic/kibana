/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { take } from 'lodash';
import { PromiseReturnType } from '../../../../../plugins/observability/typings/common';
import { ApmServices } from '../../../common/config';

export async function getErrorGroupIds({
  apmApiClient,
  start,
  end,
  serviceName = 'opbeans-java',
  count = 5,
}: {
  apmApiClient: PromiseReturnType<ApmServices['apmApiClient']>;
  start: number;
  end: number;
  serviceName?: string;
  count?: number;
}) {
  const { body } = await apmApiClient.readUser({
    endpoint: `GET /internal/apm/services/{serviceName}/error_groups/main_statistics`,
    params: {
      path: { serviceName },
      query: {
        start: new Date(start).toISOString(),
        end: new Date(end).toISOString(),
        transactionType: 'request',
        environment: 'ENVIRONMENT_ALL',
        kuery: '',
      },
    },
  });

  return take(body.error_groups.map((group) => group.group_id).sort(), count);
}
