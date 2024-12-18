/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core/server';
import { SLODefinition } from '../../domain/models';
import { SecurityException } from '../../errors';

export async function assertExpectedIndicatorSourceIndexPrivileges(
  slo: SLODefinition,
  esClient: ElasticsearchClient
) {
  const privileges = await esClient.security.hasPrivileges({
    index: [{ names: slo.indicator.params.index, privileges: ['read', 'view_index_metadata'] }],
  });
  if (!privileges.has_all_requested) {
    throw new SecurityException(
      `Missing ['read', 'view_index_metadata'] privileges on the source index [${slo.indicator.params.index}]`
    );
  }
}
