/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Client } from '@elastic/elasticsearch';
import {
  metadataIndexPattern,
  eventsIndexPattern,
  alertsIndexPattern,
  policyIndexPattern,
  metadataCurrentIndexPattern,
  telemetryIndexPattern,
} from '../../../plugins/security_solution/common/endpoint/constants';

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

export async function deleteAllDocsFromIndex(
  getService: (serviceName: 'es') => Client,
  index: string
) {
  const client = getService('es');
  await client.deleteByQuery(
    {
      body: {
        query: {
          match_all: {},
        },
      },
      index: `${index}`,
    },
    {
      ignore: [404],
    }
  );
}

export async function deleteMetadataStream(getService: (serviceName: 'es') => Client) {
  await deleteDataStream(getService, metadataIndexPattern);
}

export async function deleteAllDocsFromMetadataIndex(getService: (serviceName: 'es') => Client) {
  await deleteAllDocsFromIndex(getService, metadataIndexPattern);
}

export async function deleteAllDocsFromMetadataCurrentIndex(
  getService: (serviceName: 'es') => Client
) {
  await deleteAllDocsFromIndex(getService, metadataCurrentIndexPattern);
}

export async function deleteEventsStream(getService: (serviceName: 'es') => Client) {
  await deleteDataStream(getService, eventsIndexPattern);
}

export async function deleteAlertsStream(getService: (serviceName: 'es') => Client) {
  await deleteDataStream(getService, alertsIndexPattern);
}

export async function deletePolicyStream(getService: (serviceName: 'es') => Client) {
  await deleteDataStream(getService, policyIndexPattern);
}

export async function deleteTelemetryStream(getService: (serviceName: 'es') => Client) {
  await deleteDataStream(getService, telemetryIndexPattern);
}
