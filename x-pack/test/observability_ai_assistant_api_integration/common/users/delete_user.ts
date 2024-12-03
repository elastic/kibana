/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { InheritedFtrProviderContext } from '../ftr_provider_context';
import { UNAUTHORIZED_USERNAME } from './users';

export async function deleteUnauthorizedUser(
  getService: InheritedFtrProviderContext['getService']
) {
  const security = getService('security');
  await security.user.delete(UNAUTHORIZED_USERNAME);
}
