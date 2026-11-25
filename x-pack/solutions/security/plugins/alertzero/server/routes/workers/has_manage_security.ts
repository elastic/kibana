/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AlertZeroRequestHandlerContext } from '../../types';

/** Cluster privilege required to modify a worker. It cannot be expressed as a Kibana route privilege. */
export const hasManageSecurity = async (
  context: AlertZeroRequestHandlerContext
): Promise<boolean> => {
  const { elasticsearch } = await context.core;
  const privileges = await elasticsearch.client.asCurrentUser.security.hasPrivileges({
    cluster: ['manage_security'],
  });
  return privileges.has_all_requested === true;
};
