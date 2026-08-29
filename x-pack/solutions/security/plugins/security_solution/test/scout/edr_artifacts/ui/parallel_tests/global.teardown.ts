/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ENDPOINT_ARTIFACT_LIST_IDS } from '@kbn/securitysolution-list-constants';
import { globalTeardownHook } from '@kbn/scout-security';

const EXCEPTION_LIST_URL = '/api/exception_lists';

globalTeardownHook(
  'Delete leftover agnostic endpoint artifact lists',
  async ({ kbnClient, log }) => {
    log.debug('[teardown] deleting endpoint artifact exception lists');
    for (const listId of ENDPOINT_ARTIFACT_LIST_IDS) {
      await kbnClient.request({
        method: 'DELETE',
        path: EXCEPTION_LIST_URL,
        query: { list_id: listId, namespace_type: 'agnostic' },
        headers: {
          'elastic-api-version': '2023-10-31',
          'x-elastic-internal-origin': 'kibana',
        },
        ignoreErrors: [404],
        retries: 0,
      });
    }
  }
);
