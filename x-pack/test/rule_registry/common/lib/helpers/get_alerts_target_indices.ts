/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ALERTS_TARGET_INDICES_URL } from '../../constants';
import { GetService } from '../../types';
import { User } from '../authentication/types';
import { getSpaceUrlPrefix } from '../authentication/spaces';

export const getAlertsTargetIndices = async (
  getService: GetService,
  user: User,
  spaceId: string
) => {
  const supertest = getService('supertestWithoutAuth');
  return supertest
    .get(`${getSpaceUrlPrefix(spaceId)}${ALERTS_TARGET_INDICES_URL}`)
    .auth(user.username, user.password)
    .send()
    .set('kbn-xsrf', 'foo');
};
