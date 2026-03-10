/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SecurityIndexPrivilege } from '@elastic/elasticsearch/lib/api/types';
import type { SyntheticsEsClient } from '../../lib';
import type { SyntheticsServerSetup } from '../../types';
import { getFakeKibanaRequest } from '../utils/fake_kibana_request';
import { getServiceApiKeyPrivileges, syntheticsIndex } from '../get_api_key';

export const checkHasPrivileges = (
  server: SyntheticsServerSetup,
  apiKey: { id: string; apiKey: string }
) => {
  const { indices: index, cluster } = getServiceApiKeyPrivileges(server.isElasticsearchServerless);
  return server.coreStart.elasticsearch.client
    // TODO [CPS routing]: this client currently preserves the existing "origin-only" behavior.
    //   Review and choose one of the following options:
    //   A) Still unsure? Leave this comment as-is.
    //   B) Confirmed origin-only is correct? Replace this TODO with a concise explanation of why.
    //   C) Want to use current space’s NPRE (Named Project Routing Expression)? Change 'origin-only' to 'space' and remove this comment.
    //      Note: 'space' requires the request passed to asScoped() to carry a `url: URL` property.
    .asScoped(getFakeKibanaRequest({ id: apiKey.id, api_key: apiKey.apiKey }), { projectRouting: 'origin-only' })
    .asCurrentUser.security.hasPrivileges({
      index,
      cluster,
    });
};

export const checkIndicesReadPrivileges = (syntheticsEsClient: SyntheticsEsClient) => {
  return syntheticsEsClient.baseESClient.security.hasPrivileges({
    index: [
      {
        names: [syntheticsIndex],
        privileges: ['read'] as SecurityIndexPrivilege[],
      },
    ],
  });
};
