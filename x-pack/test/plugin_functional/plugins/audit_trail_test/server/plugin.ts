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
      { path: '/audit_trail_test/context/as_current_user', validate: false },
      async (context, request, response) => {
        context.core.auditor.withAuditScope('audit_trail_test/context/as_current_user');
        await context.core.elasticsearch.legacy.client.callAsCurrentUser('ping');
        return response.noContent();
      }
    );

    router.get(
      { path: '/audit_trail_test/context/as_internal_user', validate: false },
      async (context, request, response) => {
        context.core.auditor.withAuditScope('audit_trail_test/context/as_internal_user');
        await context.core.elasticsearch.legacy.client.callAsInternalUser('ping');
        return response.noContent();
      }
    );

    router.get(
      { path: '/audit_trail_test/contract/as_current_user', validate: false },
      async (context, request, response) => {
        const [coreStart] = await core.getStartServices();
        const auditor = coreStart.auditTrail.asScoped(request);
        auditor.withAuditScope('audit_trail_test/contract/as_current_user');

        await context.core.elasticsearch.legacy.client.callAsCurrentUser('ping');
        return response.noContent();
      }
    );

    router.get(
      { path: '/audit_trail_test/contract/as_internal_user', validate: false },
      async (context, request, response) => {
        const [coreStart] = await core.getStartServices();
        const auditor = coreStart.auditTrail.asScoped(request);
        auditor.withAuditScope('audit_trail_test/contract/as_internal_user');

        await context.core.elasticsearch.legacy.client.callAsInternalUser('ping');
        return response.noContent();
      }
    );
  }

  public start() {}
}
