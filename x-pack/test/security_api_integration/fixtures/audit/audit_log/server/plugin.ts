/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Plugin, CoreSetup } from 'src/core/server';

export class AuditTrailTestPlugin implements Plugin {
  public setup(core: CoreSetup) {
    const router = core.http.createRouter();
    router.get({ path: '/audit_log', validate: false }, async (context, request, response) => {
      const soClient = (await context.core).savedObjects.client;
      await soClient.create('dashboard', {});
      await soClient.find({ type: 'dashboard' });
      return response.noContent();
    });
  }

  public start() {}
}
