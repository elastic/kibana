/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SECURITY_SOLUTION_ENABLE_ASSET_INVENTORY_SETTING } from '@kbn/management-settings-ids';
import { rootRequest } from '../api_calls/common';
import { setKibanaSetting } from '../api_calls/kibana_advanced_settings';

const timestamp = Date.now();
const date = new Date(timestamp);
const iso8601String = date.toISOString();
const getMockAsset = () => {
  return {
    '@timestamp': iso8601String,
    agent: {
      ephemeral_id: '2756626e-5716-4d7a-bd7d-ca943b6b4376',
      id: 'YzQ5ZDdhNTYtM2QyOC0xMWYwLWI3NTUtZGViMzI0YWEyOTMz',
      name: 'agentless-6e51ea47-a09c-4999-92f1-04bd38205bd2-67f549cb5b-gb6n8',
      type: 'cloudbeat',
      version: '9.1.0',
    },
    cloud: {
      provider: 'azure',
      service: {
        name: 'Azure',
      },
    },
    data_stream: {
      dataset: 'cloud_asset_inventory.asset_inventory',
      namespace: 'default',
      type: 'logs',
    },
    division: 'engineering',
    ecs: {
      version: '8.0.0',
    },
    elastic_agent: {
      id: 'YzQ5ZDdhNTYtM2QyOC0xMWYwLWI3NTUtZGViMzI0YWEyOTMz',
      version: '9.1.0',
      snapshot: true,
    },
    entity: {
      category: 'Service Usage Technology',
      id: '/subscriptions/ef111ee2-6c89-4b09-92c6-5c2321f888df/resourceGroups/cloud-shell-storage-centralindia/providers/Microsoft.Storage/storageAccounts/csg100320021acf35e2/tableServices/default',
      name: 'generic_name_test',
      sub_type: 'Azure Storage Table Service',
      type: 'Service Usage Technology',
    },
    host: {
      name: 'host_name_test',
    },
    user: {
      name: 'user_name_test',
    },
    service: {
      name: 'service_name_test',
    },
    event: {
      dataset: 'cloud_asset_inventory.asset_inventory',
      kind: 'asset',
    },
    related: {
      entity: [
        '/subscriptions/ef111ee2-6c89-4b09-92c6-5c2321f888df/resourceGroups/cloud-shell-storage-centralindia/providers/Microsoft.Storage/storageAccounts/csg100320021acf35e2/tableServices/default',
      ],
    },
    tags: [],
    team: 'cloud-security-posture',
    message: 'test_message',
  };
};

const getAssetInventoryMapping = (indexName: string) => {
  return {
    index_patterns: [`${indexName}*`],
    template: {
      mappings: {
        properties: {
          message: {
            ignore_above: 1024,
            type: 'keyword',
          },
          agent: {
            properties: {
              name: {
                ignore_above: 1024,
                type: 'keyword',
              },
              id: {
                ignore_above: 1024,
                type: 'keyword',
              },
              ephemeral_id: {
                ignore_above: 1024,
                type: 'keyword',
              },
              type: {
                ignore_above: 1024,
                type: 'keyword',
              },
              version: {
                ignore_above: 1024,
                type: 'keyword',
              },
            },
          },
          network: {
            properties: {
              name: {
                ignore_above: 1024,
                type: 'keyword',
              },
            },
          },
          labels: {
            dynamic: true,
            type: 'object',
          },
          cloud: {
            properties: {
              availability_zone: {
                ignore_above: 1024,
                type: 'keyword',
              },
              instance: {
                properties: {
                  name: {
                    ignore_above: 1024,
                    type: 'keyword',
                  },
                  id: {
                    ignore_above: 1024,
                    type: 'keyword',
                  },
                },
              },
              provider: {
                ignore_above: 1024,
                type: 'keyword',
              },
              machine: {
                properties: {
                  type: {
                    ignore_above: 1024,
                    type: 'keyword',
                  },
                },
              },
              service: {
                properties: {
                  name: {
                    ignore_above: 1024,
                    type: 'keyword',
                  },
                },
              },
              project: {
                properties: {
                  name: {
                    ignore_above: 1024,
                    type: 'keyword',
                  },
                  id: {
                    ignore_above: 1024,
                    type: 'keyword',
                  },
                },
              },
              region: {
                ignore_above: 1024,
                type: 'keyword',
              },
              account: {
                properties: {
                  name: {
                    ignore_above: 1024,
                    type: 'keyword',
                  },
                  id: {
                    ignore_above: 1024,
                    type: 'keyword',
                  },
                },
              },
            },
          },
          '@timestamp': {
            ignore_malformed: false,
            type: 'date',
          },
          ecs: {
            properties: {
              version: {
                ignore_above: 1024,
                type: 'keyword',
              },
            },
          },
          related: {
            properties: {
              entity: {
                ignore_above: 1024,
                type: 'keyword',
              },
            },
          },
          data_stream: {
            properties: {
              namespace: {
                type: 'constant_keyword',
              },
              type: {
                type: 'constant_keyword',
              },
              dataset: {
                type: 'constant_keyword',
              },
            },
          },
          host: {
            properties: {
              ip: {
                type: 'ip',
              },
              name: {
                ignore_above: 1024,
                type: 'keyword',
              },
              id: {
                ignore_above: 1024,
                type: 'keyword',
              },
              type: {
                ignore_above: 1024,
                type: 'keyword',
              },
              mac: {
                ignore_above: 1024,
                type: 'keyword',
              },
              architecture: {
                ignore_above: 1024,
                type: 'keyword',
              },
            },
          },
          event: {
            properties: {
              kind: {
                ignore_above: 1024,
                type: 'keyword',
              },
            },
          },
          user: {
            properties: {
              name: {
                ignore_above: 1024,
                type: 'keyword',
                fields: {
                  text: {
                    type: 'match_only_text',
                  },
                },
              },
              id: {
                ignore_above: 1024,
                type: 'keyword',
              },
            },
          },
          entity: {
            properties: {
              name: {
                ignore_above: 1024,
                type: 'keyword',
              },
              id: {
                ignore_above: 1024,
                type: 'keyword',
              },
              type: {
                ignore_above: 1024,
                type: 'keyword',
              },
              sub_type: {
                ignore_above: 1024,
                type: 'keyword',
              },
            },
          },
          service: {
            properties: {
              address: {
                type: 'ip',
              },
              environment: {
                ignore_above: 1024,
                type: 'keyword',
              },
              id: {
                ignore_above: 1024,
                type: 'keyword',
              },
              ephemeral_id: {
                ignore_above: 1024,
                type: 'keyword',
              },
              state: {
                type: 'keyword',
              },
              type: {
                type: 'keyword',
              },
              version: {
                type: 'keyword',
              },
              name: {
                type: 'keyword',
              },
            },
          },
        },
      },
    },
  };
};

export const createAssetInventoryMapping = (indexName: string) => {
  return rootRequest({
    method: 'PUT',
    url: `${Cypress.env('ELASTICSEARCH_URL')}/_index_template/${indexName}`,
    body: getAssetInventoryMapping(indexName),
  });
};

export const createMockAsset = (indexName: string) => {
  return rootRequest({
    method: 'POST',
    url: `${Cypress.env('ELASTICSEARCH_URL')}/${indexName}/_doc`,
    body: getMockAsset(),
  });
};

export const enableAssetInventoryApiCall = () => {
  return rootRequest({
    method: 'POST',
    url: `/api/asset_inventory/enable`,
    body: {},
  });
};

export const disableAssetInventory = () => {
  setKibanaSetting(SECURITY_SOLUTION_ENABLE_ASSET_INVENTORY_SETTING, false);
};

export const enableAssetInventory = () => {
  setKibanaSetting(SECURITY_SOLUTION_ENABLE_ASSET_INVENTORY_SETTING, true);
};

export const waitForStatusReady = (retries = 5) => {
  if (retries === 0) throw new Error('Status never became ready');

  cy.intercept('GET', '/api/asset_inventory/status').as('getStatus');

  cy.reload();
  cy.wait('@getStatus', { timeout: 20000 }).then(({ response }) => {
    if (response?.body?.status !== 'ready') {
      // eslint-disable-next-line cypress/no-unnecessary-waiting
      cy.wait(3000);
      waitForStatusReady(retries - 1);
    } else {
      expect(response.body.status).to.eq('ready');
    }
  });
};
