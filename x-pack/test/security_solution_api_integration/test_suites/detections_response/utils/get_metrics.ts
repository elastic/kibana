/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type SuperTest from 'supertest';

export const getMetrics = async (supertest: SuperTest.Agent, reset: boolean = false) =>
  (
    await supertest
      .get(`/api/task_manager/metrics${reset ? '' : '?reset=false'}`)
      .set('kbn-xsrf', 'foo')
      .expect(200)
  ).body;
