/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Client } from '@elastic/elasticsearch';
<<<<<<<< HEAD:x-pack/test/apm_api_integration/tests/alerts/helpers/get_active_alert.ts

export async function getActiveAlert({
========
import { APM_ALERTS_INDEX } from './constants';
async function getActiveAlert({
>>>>>>>> e6543b0cb1e (Split up helper function into seperate files):x-pack/test/apm_api_integration/tests/alerts/helpers/wait_for_active_alert.ts
  ruleId,
  esClient,
  index,
}: {
  ruleId: string;
  esClient: Client;
  index: string;
}): Promise<Record<string, any>> {
  const searchParams = {
<<<<<<<< HEAD:x-pack/test/apm_api_integration/tests/alerts/helpers/get_active_alert.ts
    index,
========
    index: APM_ALERTS_INDEX,
>>>>>>>> e6543b0cb1e (Split up helper function into seperate files):x-pack/test/apm_api_integration/tests/alerts/helpers/wait_for_active_alert.ts
    size: 1,
    query: {
      bool: {
        filter: [
          {
            term: {
              'kibana.alert.rule.producer': 'apm',
            },
          },
          {
            term: {
              'kibana.alert.status': 'active',
            },
          },
          {
            term: {
              'kibana.alert.rule.uuid': ruleId,
            },
          },
        ],
      },
    },
  };
  const response = await esClient.search(searchParams);
  const firstHit = response.hits.hits[0];
  if (!firstHit) {
    throw new Error(`No active alert found for rule ${ruleId}`);
  }
  return firstHit;
}
