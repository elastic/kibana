/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ENDPOINT_ARTIFACT_LIST_IDS } from '@kbn/securitysolution-list-constants';
import { getEndpointArtifactsApiService, globalTeardownHook } from '@kbn/scout-security';

globalTeardownHook(
  'Delete leftover agnostic endpoint artifact lists',
  async ({ kbnClient, log }) => {
    log.debug('[teardown] deleting endpoint artifact exception lists');
    await getEndpointArtifactsApiService({ kbnClient, log }).deleteAll([
      ...ENDPOINT_ARTIFACT_LIST_IDS,
    ]);
  }
);
