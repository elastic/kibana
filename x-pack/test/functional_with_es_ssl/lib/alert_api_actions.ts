/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ObjectRemover } from './object_remover';
import { getTestAlertData, getTestActionData } from './get_test_data';

export async function createAlertManualCleanup({
  supertest,
  overwrites = {},
}: {
  supertest: any;
  overwrites?: Record<string, any>;
}) {
  const { body: createdAlert } = await supertest
    .post('/api/alerting/rule')
    .set('kbn-xsrf', 'foo')
    .send(getTestAlertData(overwrites))
    .expect(200);
  return createdAlert;
}

export async function createFailingAlert({
  supertest,
  objectRemover,
}: {
  supertest: any;
  objectRemover: ObjectRemover;
}) {
  return await createAlert({
    supertest,
    overwrites: {
      rule_type_id: 'test.failing',
      schedule: { interval: '30s' },
    },
    objectRemover,
  });
}

export async function createAlert({
  supertest,
  objectRemover,
  overwrites = {},
}: {
  supertest: any;
  objectRemover: ObjectRemover;
  overwrites?: Record<string, any>;
}) {
  const createdAlert = await createAlertManualCleanup({ supertest, overwrites });
  objectRemover.add(createdAlert.id, 'alert', 'alerts');
  return createdAlert;
}

export async function createAction({
  supertest,
  objectRemover,
  overwrites = {},
}: {
  supertest: any;
  objectRemover: ObjectRemover;
  overwrites?: Record<string, any>;
}) {
  const { body: createdAction } = await supertest
    .post('/api/actions/connector')
    .set('kbn-xsrf', 'foo')
    .send(getTestActionData(overwrites))
    .expect(200);
  objectRemover.add(createdAction.id, 'action', 'actions');
  return createdAction;
}

export async function muteAlert({ supertest, alertId }: { supertest: any; alertId: string }) {
  const { body: alert } = await supertest
    .post(`/api/alerting/rule/${alertId}/_mute_all`)
    .set('kbn-xsrf', 'foo');
  return alert;
}

export async function disableAlert({ supertest, alertId }: { supertest: any; alertId: string }) {
  const { body: alert } = await supertest
    .post(`/api/alerting/rule/${alertId}/_disable`)
    .set('kbn-xsrf', 'foo');
  return alert;
}
