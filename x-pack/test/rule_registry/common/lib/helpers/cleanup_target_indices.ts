/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { GetService } from '../../types';
import { User } from '../authentication/types';
import { getAlertsTargetIndices } from './get_alerts_target_indices';

export const cleanupTargetIndices = async (getService: GetService, user: User, spaceId: string) => {
  const es = getService('es');
  try {
    const { body: targetIndices } = await getAlertsTargetIndices(getService, user, spaceId);
    const aliasMap = await es.indices.getAlias({
      name: targetIndices,
      allow_no_indices: true,
      expand_wildcards: 'open',
    });
    const indices = Object.keys(aliasMap);
    expect(indices.length > 0).to.be(true);
    return es.indices.delete({ index: indices }, { ignore: [404] });
  } catch (error) {
    if (error.meta.statusCode !== 404) {
      throw error;
    }
  }
};
