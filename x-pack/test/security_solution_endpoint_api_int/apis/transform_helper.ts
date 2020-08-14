/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Client } from '@elastic/elasticsearch';

export async function putTransform(getService: (serviceName: 'es') => Client, transformId: string) {
  const esClient = getService('es');
  await esClient.transform.putTransform({
    transform_id: transformId,
    defer_validation: false,
    body: {
      source: {
        index: 'metrics-endpoint.metadata-default',
      },
      dest: {
        index: 'metrics-endpoint.metadata_current-default',
      },
      pivot: {
        group_by: {
          'agent.id': {
            terms: {
              field: 'agent.id',
            },
          },
        },
        aggregations: {
          HostDetails: {
            scripted_metric: {
              init_script: "state.timestamp_latest = 0L; state.last_doc=''",
              map_script:
                "def current_date = doc['@timestamp'].getValue().toInstant().toEpochMilli(); if (current_date > state.timestamp_latest) {state.timestamp_latest = current_date;state.last_doc = new HashMap(params['_source']);}",
              combine_script: 'return state',
              reduce_script:
                "def last_doc = '';def timestamp_latest = 0L; for (s in states) {if (s.timestamp_latest > (timestamp_latest)) {timestamp_latest = s.timestamp_latest; last_doc = s.last_doc;}} return last_doc",
            },
          },
        },
      },
      description: 'collapse and update the latest document for each host',
      frequency: '1m',
      sync: {
        time: {
          field: 'event.created',
          delay: '60s',
        },
      },
    },
  });

  await esClient.transform.startTransform({
    transform_id: transformId,
    timeout: '60s',
  });

  // wait for transform to apply
  await new Promise((r) => setTimeout(r, 70000));
}

export async function deleteTransform(
  getService: (serviceName: 'es') => Client,
  transformId: string
) {
  const esClient = getService('es');
  await esClient.transform.deleteTransform({
    transform_id: transformId,
    force: true,
  });
}
