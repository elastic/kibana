/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { AlertZeroRequestHandlerContext } from '../../types';

/** Cluster privilege required to modify a worker. It cannot be expressed as a Kibana route privilege. */
export const hasManageSecurityPrivilege = async (
  esClient: ElasticsearchClient
): Promise<boolean> => {
  const privileges = await esClient.security.hasPrivileges({ cluster: ['manage_security'] });
  return privileges.has_all_requested === true;
};

export const hasManageSecurity = async (
  context: AlertZeroRequestHandlerContext
): Promise<boolean> => {
  const { elasticsearch } = await context.core;
  return hasManageSecurityPrivilege(elasticsearch.client.asCurrentUser);
};
