/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ES_ARCHIVER_ACTION_ID } from './constants';

const esTestIndexName = '.kibaka-alerting-test-data';

export function getTestAlertData(attributeOverwrites = {}) {
  return {
    alertTypeId: 'test.noop',
    interval: 10 * 1000,
    actions: [
      {
        group: 'default',
        id: ES_ARCHIVER_ACTION_ID,
        params: {
          message:
            'instanceContextValue: {{context.instanceContextValue}}, instanceStateValue: {{state.instanceStateValue}}',
        },
      },
    ],
    alertTypeParams: {},
    ...attributeOverwrites,
  };
}

export async function setupEsTestIndex(es: any) {
  await es.indices.create({
    index: esTestIndexName,
    body: {
      mappings: {
        properties: {
          source: {
            type: 'keyword',
          },
          reference: {
            type: 'keyword',
          },
          params: {
            enabled: false,
            type: 'object',
          },
          config: {
            enabled: false,
            type: 'object',
          },
          state: {
            enabled: false,
            type: 'object',
          },
        },
      },
    },
  });
  return {
    name: esTestIndexName,
  };
}

export async function destroyEsTestIndex(es: any) {
  await es.indices.delete({ index: esTestIndexName, ignore: [404] });
}
