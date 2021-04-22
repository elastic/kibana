/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { CoreSetup } from '../../../../../../../src/core/server';
import {
  SecurityPluginStart,
  SessionUserDataStorageScope,
} from '../../../../../../plugins/security/server';

export function initRoutes(
  core: CoreSetup<{ security: SecurityPluginStart }>,
  userDataScope: SessionUserDataStorageScope
) {
  const router = core.http.createRouter();
  const userDataStoragePromise = core
    .getStartServices()
    .then(([, { security }]) => security.session.userData.getStorage(userDataScope));
  router.get(
    {
      path: '/api/session_user_data/{key}',
      validate: { params: schema.object({ key: schema.string() }) },
    },
    async (context, request, response) => {
      const userDataStorage = await userDataStoragePromise;
      return response.ok({ body: (await userDataStorage.get(request, request.params.key)) || {} });
    }
  );

  router.post(
    {
      path: '/api/session_user_data/{key}',
      validate: { params: schema.object({ key: schema.string() }), body: schema.any() },
    },
    async (context, request, response) => {
      const userDataStorage = await userDataStoragePromise;
      await userDataStorage.set(request, request.params.key, request.body);
      return response.ok();
    }
  );

  router.delete(
    {
      path: '/api/session_user_data/{key}',
      validate: { params: schema.object({ key: schema.string() }) },
    },
    async (context, request, response) => {
      const userDataStorage = await userDataStoragePromise;
      await userDataStorage.remove(request, request.params.key);
      return response.ok();
    }
  );
}
