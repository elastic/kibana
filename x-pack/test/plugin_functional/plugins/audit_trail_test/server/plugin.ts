/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Plugin, CoreSetup } from 'src/core/server';

export class AuditTrailTestPlugin implements Plugin {
  public setup(core: CoreSetup) {
    core.savedObjects.registerType({
      name: 'audit_trail_test',
      hidden: false,
      namespaceType: 'agnostic',
      mappings: {
        properties: {},
      },
    });

    const router = core.http.createRouter();

    router.get(
      { path: '/audit_trail_test/audit_trail_service', validate: false },
      async (context, request, response) => {
        const [coreStart] = await core.getStartServices();
        coreStart.auditTrail.asScoped(request);

        return response.noContent();
      }
    );

    router.get(
      { path: '/audit_trail_test/saved_objects_client', validate: false },
      async (context, request, response) => {
        await context.core.savedObjects.client.create('dashboard', {});
        await context.core.savedObjects.client.find({ type: 'dashboard' });
        return response.noContent();
      }
    );
  }

  public start() {}
}
