/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { User, TEST_PASSWORD } from '../common/users';
import { GetService, AlertDef } from '../common/types';

export const createAlert = async (getService: GetService, user: User, alertDef: AlertDef) => {
  const supertest = getService('supertest');
  const { body: response, status } = await supertest
    .post('/api/alerts/alert')
    .auth(user, TEST_PASSWORD)
    .send(alertDef)
    .set('kbn-xsrf', 'foo');
  return { alert: response, status };
};
