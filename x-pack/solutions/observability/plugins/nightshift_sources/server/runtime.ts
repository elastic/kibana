/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreTasksStart, KibanaRequest, Logger } from '@kbn/core/server';
import { PROJECT_ROUTING_ALL } from '@kbn/cps-server-utils';
import { EsqlViewsClient } from './lib/esql_views_client';
import type { SourceChangeEmitter } from './lib/source_change_emitter';
import { SourcesClient } from './lib/sources_client';
import { NIGHTSHIFT_SOURCE_SO_TYPE } from './saved_objects/nightshift_source_saved_object';

/** The part of Core the sources client reads; Kibana's `CoreStart` and a task pod both have it. */
export type SourcesCoreStart = Pick<CoreTasksStart, 'savedObjects' | 'elasticsearch' | 'security'>;

/**
 * The scoped sources client. Kibana's `server` entry and the task pod's `server/tasks` entry both
 * build it here.
 */
export const createSourcesClient = (
  core: SourcesCoreStart,
  request: KibanaRequest,
  logger: Logger,
  sourceChangeEmitter: SourceChangeEmitter
): SourcesClient => {
  // Hidden types are left out of the scoped client unless named. Nightshift `all` / `read`
  // grant this type, so the security extension authorizes the call and writes the audit event.
  // `configure_nightshift` does not include it. The spaces extension stays on.
  const soClient = core.savedObjects.getScopedClient(request, {
    includedHiddenTypes: [NIGHTSHIFT_SOURCE_SO_TYPE],
  });

  // Views live in the origin project. Reads run as the user; writes run as kibana_system, so the
  // views stay in sync with their saved objects. The write routes require the `manage` privilege.
  // Validation and health probes read the data behind a source, which under CPS may live in
  // linked projects, so they route across all of them.
  const userViewsEsClient = core.elasticsearch.client.asScoped(request).asCurrentUser;
  const dataEsClient = core.elasticsearch.client.asScoped(request, {
    projectRouting: 'expression',
    value: PROJECT_ROUTING_ALL,
  }).asCurrentUser;

  return new SourcesClient({
    soClient,
    serializer: core.savedObjects.createSerializer(),
    viewsClient: new EsqlViewsClient({
      userEsClient: userViewsEsClient,
      internalEsClient: core.elasticsearch.client.asInternalUser,
    }),
    dataEsClient,
    internalEsClient: core.elasticsearch.client.asInternalUser,
    logger,
    username: core.security.authc.getCurrentUser(request)?.username ?? '<system>',
    spaceId: request.spaceId,
    onChange: (change) => sourceChangeEmitter.emit({ ...change, request }),
  });
};
