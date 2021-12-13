/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { GetService } from '../../types';
import { User } from '../authentication/types';
import { getSpaceUrlPrefix } from '../authentication/spaces';

export const getAlertsTargetIndices = async (
  getService: GetService,
  user: User,
  registrationContext: string,
  spaceId: string = 'default',
  namespace: string = 'default'
) => {
  const url = `${getSpaceUrlPrefix(
    spaceId
  )}/api/observability/rules/alerts/dynamic_index_pattern?namespace=${namespace}&registrationContexts=${registrationContext}`;
  const supertest = getService('supertestWithoutAuth');
  return supertest.get(url).auth(user.username, user.password).send().set('kbn-xsrf', 'foo');
};
