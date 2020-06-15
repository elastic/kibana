/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Client } from '@elastic/elasticsearch';

export async function deleteDataStream(getService: (serviceName: 'es') => Client, index: string) {
  const client = getService('es');
  await client.transport.request(
    {
      method: 'DELETE',
      path: `_data_stream/${index}`,
    },
    {
      ignore: [404],
    }
  );
}

export async function deleteMetadataStream(getService: (serviceName: 'es') => Client) {
  await deleteDataStream(getService, 'metrics-endpoint.metadata-*');
}

export async function deleteEventsStream(getService: (serviceName: 'es') => Client) {
  await deleteDataStream(getService, 'events-endpoint-*');
}

export async function deletePolicyStream(getService: (serviceName: 'es') => Client) {
  await deleteDataStream(getService, 'metrics-endpoint.policy-*');
}
