/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { APM_METRIC_INDEX_NAME } from '../../constants';
import { GetService } from '../../types';
import { getSpaceUrlPrefix } from '../authentication/spaces';
import { User } from '../authentication/types';
import { getAlertsTargetIndices } from './get_alerts_target_indices';

export const deleteAlert = async (
  getService: GetService,
  user: User,
  spaceId: string,
  id: string | undefined
) => {
  const es = getService('es');
  const supertest = getService('supertestWithoutAuth');
  const { body: targetIndices } = await getAlertsTargetIndices(getService, user, spaceId);
  if (id) {
    const { body, status } = await supertest
      .delete(`${getSpaceUrlPrefix(spaceId)}/api/alerts/alert/${id}`)
      .auth(user.username, user.password)
      .set('kbn-xsrf', 'foo');

    if (status >= 300) {
      const error = new Error('Error deleting alert');
      Object.assign(error, { response: { body, status } });
      throw error;
    }
  }

  await es.deleteByQuery({
    index: targetIndices[0],
    body: {
      query: {
        match_all: {},
      },
    },
    refresh: true,
  });

  await es.indices.delete({
    index: APM_METRIC_INDEX_NAME,
  });
};
