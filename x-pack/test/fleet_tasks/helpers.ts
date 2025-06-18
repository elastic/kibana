/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AGENTS_INDEX } from '@kbn/fleet-plugin/common';
import { FtrProviderContext } from '../api_integration/ftr_provider_context';

export async function createAgentDoc(
  providerContext: FtrProviderContext,
  id: string,
  policyId: string,
  version: string,
  active: boolean = true,
  additionalData: any = {}
) {
  const { getService } = providerContext;
  const es = getService('es');
  const lastCheckin = active
    ? new Date().toISOString()
    : new Date(new Date().getTime() - 21 * 24 * 60 * 60 * 1000).toISOString(); // 3 weeks ago

  await es.index({
    index: AGENTS_INDEX,
    id,
    document: {
      id,
      type: 'PERMANENT',
      active: true,
      enrolled_at: new Date().toISOString(),
      last_checkin: lastCheckin,
      policy_id: policyId,
      policy_revision: 1,
      policy_revision_idx: 1,
      agent: {
        id,
        version,
      },
      local_metadata: {
        elastic: {
          agent: {
            version,
            upgradeable: true,
          },
        },
      },
      ...additionalData,
    },
    refresh: 'wait_for',
  });
}

export async function cleanupAgentDocs(providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const es = getService('es');

  try {
    await es.deleteByQuery({
      index: AGENTS_INDEX,
      refresh: true,
      query: {
        match_all: {},
      },
    });
  } catch (err) {
    // index doesn't exist
  }
}
