/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SimpleSavedObject } from '@kbn/core-saved-objects-api-browser';
import { MonitorFields } from '@kbn/synthetics-plugin/common/runtime_types';
import { SuperTest, Test } from 'supertest';

export async function deleteMonitor(supertest: SuperTest<Test>, id: string, route: string) {
  try {
    await supertest.delete(`${route}/${id}`).set('kbn-xsrf', 'true').expect(200);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(e);
  }
}

export async function saveMonitor(
  supertest: SuperTest<Test>,
  monitor: MonitorFields,
  route: string
) {
  const res = await supertest.post(route).set('kbn-xsrf', 'true').send(monitor);

  return res.body as SimpleSavedObject<MonitorFields>;
}
