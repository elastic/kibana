/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import { getRouteUrlForSpace } from '@kbn/spaces-plugin/common';
import type { FtrProviderContext } from '../../../../ftr_provider_context';

interface GetRuleTaskIdParams {
  getService: FtrProviderContext['getService'];
  ruleId: string;
  spaceId?: string;
}

interface AssertRuleTaskParams {
  getService: FtrProviderContext['getService'];
  enabled: boolean;
  ruleId?: string;
  spaceId?: string;
  taskId?: string;
}

interface AssertNoRuleTaskParams {
  getService: FtrProviderContext['getService'];
  ruleId: string;
  spaceId?: string;
}

export const getRuleTaskId = async ({
  getService,
  ruleId,
  spaceId,
}: GetRuleTaskIdParams): Promise<string> => {
  const supertest = getService('supertest');
  const { body } = await supertest
    .get(getRouteUrlForSpace(`/api/alerting/rule/${ruleId}`, spaceId))
    .set('kbn-xsrf', 'true')
    .expect(200);

  if (typeof body.scheduled_task_id !== 'string') {
    throw new Error(`Rule ${ruleId} has no scheduled task`);
  }

  return body.scheduled_task_id;
};

export const assertNoRuleTask = async ({
  getService,
  ruleId,
  spaceId,
}: AssertNoRuleTaskParams): Promise<void> => {
  const supertest = getService('supertest');
  const { body } = await supertest
    .get(getRouteUrlForSpace(`/api/alerting/rule/${ruleId}`, spaceId))
    .set('kbn-xsrf', 'true')
    .expect(200);

  expect(body.scheduled_task_id).toBeUndefined();
};

export const assertRuleTask = async ({
  getService,
  enabled,
  ruleId,
  spaceId,
  taskId,
}: AssertRuleTaskParams): Promise<void> => {
  const kibanaServer = getService('kibanaServer');
  const retry = getService('retry');
  const id = taskId ?? (ruleId ? await getRuleTaskId({ getService, ruleId, spaceId }) : undefined);

  if (!id) {
    throw new Error('ruleId or taskId is required');
  }

  await retry.try(async () => {
    const task = await kibanaServer.savedObjects.get({
      type: 'task',
      id,
    });

    expect(task.attributes.taskType).toBe('alerting:siem.queryRule');
    expect(task.attributes.enabled).toBe(enabled);
  });
};
