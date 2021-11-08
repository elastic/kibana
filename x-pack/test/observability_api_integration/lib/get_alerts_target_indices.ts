/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { GetService } from '../common/types';
import { User, TEST_PASSWORD } from '../common/users';
import { ALERTS_TARGET_INDICES_URL } from '../common/constants';

export const getAlertsTargetIndices = async (getService: GetService, user: User) => {
  const supertest = getService('supertest');
  return supertest
    .get(ALERTS_TARGET_INDICES_URL)
    .auth(user, TEST_PASSWORD)
    .send()
    .set('kbn-xsrf', 'foo');
};
