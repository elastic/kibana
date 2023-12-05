/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrSupertest } from '@kbn/ftr-common-functional-services';
import { User } from '../authentication/types';

export const getSpaceUrlPrefix = (spaceId: string | undefined | null) => {
  return spaceId && spaceId !== 'default' ? `/s/${spaceId}` : ``;
};

export const setupAuth = ({
  apiCall,
  headers,
  auth,
}: {
  apiCall: FtrSupertest;
  headers: Record<string, unknown>;
  auth?: { user: User; space: string | null } | null;
}) => {
  if (!Object.hasOwn(headers, 'Cookie') && auth != null) {
    return apiCall.auth(auth.user.username, auth.user.password);
  }

  return apiCall;
};
