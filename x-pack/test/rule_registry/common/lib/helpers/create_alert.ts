/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { User } from '../authentication/types';
import type { GetService, AlertDef } from '../../types';
import { getSpaceUrlPrefix } from '../authentication/spaces';

export const createAlert = async (
  getService: GetService,
  user: User,
  spaceId: string,
  alertDef: AlertDef
) => {
  const supertest = getService('supertestWithoutAuth');
  const { body: response, status } = await supertest
    .post(`${getSpaceUrlPrefix(spaceId)}/api/alerting/rule`)
    .auth(user.username, user.password)
    .send(alertDef)
    .set('kbn-xsrf', 'foo');
  return { alert: response, status };
};
