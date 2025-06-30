/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SECURITY_SOLUTION_ENABLE_ASSET_INVENTORY_SETTING } from '@kbn/management-settings-ids';
import { getDataTestSubjectSelector } from '../../helpers/common';
import { login } from '../../tasks/login';
import { visit } from '../../tasks/navigation';
import { setKibanaSetting } from '../../tasks/api_calls/kibana_advanced_settings';
import { ASSET_INVENTORY_URL } from '../../urls/navigation';
import { postDataView, rootRequest } from '../../tasks/api_calls/common';

const NO_PRIVILEGES_BOX = getDataTestSubjectSelector('noPrivilegesPage');
const ALL_ASSETS_TITLE = getDataTestSubjectSelector('asset-inventory-test-subj-page-title');
const FLYOUT_RIGHT_PANEL = getDataTestSubjectSelector('rightSection');
const FLYOUT_CARDS = getDataTestSubjectSelector('responsive-data-card');
const DATAGRID_COLUMN_SELECTOR = getDataTestSubjectSelector('dataGridColumnSelectorButton');
const DATAGRID_SORTING_SELECTOR = getDataTestSubjectSelector('dataGridColumnSortingButton');
const DATAGRID_HEADER = getDataTestSubjectSelector('dataGridHeader');
const TAKE_ACTION_BUTTON = getDataTestSubjectSelector('take-action-button');
const INVESTIGATE_IN_TIMELINE_BUTTON = getDataTestSubjectSelector(
  'investigate-in-timeline-take-action-button'
);
const TIMELINE_BODY = getDataTestSubjectSelector('timeline-body');
const TYPE_FILTER_BOX = getDataTestSubjectSelector('optionsList-control-0');
const NAME_FILTER_BOX = getDataTestSubjectSelector('optionsList-control-1');
const ID_FILTER_BOX = getDataTestSubjectSelector('optionsList-control-2');

const getFilterValueDataTestSubj = (value: string) => {
  return getDataTestSubjectSelector('optionsList-control-selection-' + value);
};

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

const createAssetInventoryMapping = (indexName: string) => {
  return rootRequest({
    method: 'PUT',
    url: `${Cypress.env('ELASTICSEARCH_URL')}/_index_template/${indexName}`,
    body: getAssetInventoryMapping(indexName),
  });
};

const createMockAsset = (indexName: string) => {
  return rootRequest({
    method: 'POST',
    url: `${Cypress.env('ELASTICSEARCH_URL')}/${indexName}/_doc`,
    body: getMockAsset(),
  });
};

const enableAssetInventoryApiCall = () => {
  return rootRequest({
    method: 'POST',
    url: `/api/asset_inventory/enable`,
    body: {},
  });
};

const disableAssetInventory = () => {
  setKibanaSetting(SECURITY_SOLUTION_ENABLE_ASSET_INVENTORY_SETTING, false);
};

const enableAssetInventory = () => {
  setKibanaSetting(SECURITY_SOLUTION_ENABLE_ASSET_INVENTORY_SETTING, true);
};

const waitForStatusReady = (retries = 5) => {
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

describe('Asset Inventory page - uiSetting disabled', { tags: ['@ess', '@serverless'] }, () => {
  beforeEach(() => {
    login();
    disableAssetInventory();
    visit(ASSET_INVENTORY_URL);
  });

  it('should navigate user to Security welcome when asset inventory is not enabled', () => {
    // Should navigate user back to Security welcome page
    cy.url().should('include', 'security/get_started');
  });
});

describe('Asset Inventory page - user flyout', { tags: ['@ess'] }, () => {
  before(() => {
    postDataView('logs*', 'security-solution-default', 'security-solution-default');
    enableAssetInventory();
    enableAssetInventoryApiCall();
    createAssetInventoryMapping('logs-cba');
    createMockAsset('logs-cba');
  });

  beforeEach(() => {
    login();
    visit(ASSET_INVENTORY_URL);
    cy.intercept('GET', '/api/asset_inventory/status').as('getStatus');
    waitForStatusReady(30);
  });

  it('should display All assets title', () => {
    cy.get(NO_PRIVILEGES_BOX).should('not.exist');
    cy.get(ALL_ASSETS_TITLE).should('be.visible');
  });

  it('renders data grid', () => {
    cy.get(DATAGRID_COLUMN_SELECTOR).should('be.visible');
    cy.get(DATAGRID_SORTING_SELECTOR).should('be.visible');
    // We know there are 4 assets because our mock covers generic, user, host, service type of flyout
    cy.contains('4 assets').should('be.visible');
    // Make sure all the Default Column exist
    cy.get(DATAGRID_HEADER).should('contain', 'Name');
    cy.get(DATAGRID_HEADER).should('contain', 'ID');
    cy.get(DATAGRID_HEADER).should('contain', 'Type');
    cy.get(DATAGRID_HEADER).should('contain', 'Last Seen');
  });

  it('should be able to open generic flyout and open take action button', () => {
    cy.get(getDataTestSubjectSelector('docTableExpandToggleColumn')).eq(0).click();
    cy.get(FLYOUT_RIGHT_PANEL).should('be.visible');
    cy.get(FLYOUT_CARDS).should('contain', 'Criticality');
    cy.get(FLYOUT_CARDS).should('contain', 'ID');
    cy.get(FLYOUT_CARDS).should('contain', 'Type');
    cy.get(FLYOUT_CARDS).should('contain', 'Sub Type');
    cy.contains('Highlighted Fields').click();
    cy.contains('cloud.provider').should('be.visible');
    cy.get(TAKE_ACTION_BUTTON).click();
    cy.get(INVESTIGATE_IN_TIMELINE_BUTTON).click();
    cy.get(TIMELINE_BODY)
      .filter(':contains("test_message")')
      .then((matchedElements) => {
        const count = matchedElements.length;
        expect(count).to.be.greaterThan(0);
      });
  });

  it('should be able to open host flyout and open take action button', () => {
    cy.get(getDataTestSubjectSelector('docTableExpandToggleColumn')).eq(1).click();
    cy.get(FLYOUT_RIGHT_PANEL).should('be.visible');
    // Host ID field only shows up on host flyout
    cy.contains('Host ID').should('be.visible');
    cy.get(TAKE_ACTION_BUTTON).click();
    cy.get(INVESTIGATE_IN_TIMELINE_BUTTON).click();
    cy.get(TIMELINE_BODY)
      .filter(':contains("test_message")')
      .then((matchedElements) => {
        const count = matchedElements.length;
        expect(count).to.be.greaterThan(0);
      });
  });

  it('should be able to open service flyout', () => {
    cy.get(getDataTestSubjectSelector('docTableExpandToggleColumn')).eq(2).click();
    cy.get(FLYOUT_RIGHT_PANEL).should('be.visible');
    // Service ID field only shows up on service flyout
    cy.contains('Service ID').should('be.visible');
  });

  it('should be able to open user flyout and open take action button', () => {
    cy.get(getDataTestSubjectSelector('docTableExpandToggleColumn')).eq(3).click();
    cy.get(FLYOUT_RIGHT_PANEL).should('be.visible');
    // User ID field only shows up on user flyout
    cy.contains('User ID').should('be.visible');
    cy.get(TAKE_ACTION_BUTTON).click();
    cy.get(INVESTIGATE_IN_TIMELINE_BUTTON).click();
    cy.get(TIMELINE_BODY)
      .filter(':contains("test_message")')
      .then((matchedElements) => {
        const count = matchedElements.length;
        expect(count).to.be.greaterThan(0);
      });
  });

  it('each filter should be populated with correct options', () => {
    // Type Filter Box should only contain 2 options
    cy.get(TYPE_FILTER_BOX).click();
    cy.get(getFilterValueDataTestSubj('exists')).should('be.visible');
    cy.get(getFilterValueDataTestSubj('Service Usage Technology')).should('be.visible');

    // Name Filter Box should only contain 2 options
    cy.get(NAME_FILTER_BOX).click();
    cy.get(getFilterValueDataTestSubj('exists')).should('be.visible');
    cy.get(getFilterValueDataTestSubj('generic_name_test')).should('be.visible');
    cy.get(getFilterValueDataTestSubj('host_name_test')).should('be.visible');
    cy.get(getFilterValueDataTestSubj('service_name_test')).should('be.visible');
    cy.get(getFilterValueDataTestSubj('user_name_test')).should('be.visible');

    // ID Filter Box should only contain 2 options
    cy.get(ID_FILTER_BOX).click();
    cy.get(getFilterValueDataTestSubj('exists')).should('be.visible');
    cy.get(
      getFilterValueDataTestSubj(
        '/subscriptions/ef111ee2-6c89-4b09-92c6-5c2321f888df/resourceGroups/cloud-shell-storage-centralindia/providers/Microsoft.Storage/storageAccounts/csg100320021acf35e2/tableServices/default'
      )
    ).should('be.visible');
    cy.get(getFilterValueDataTestSubj('host_name_test')).should('be.visible');
    cy.get(getFilterValueDataTestSubj('service_name_test')).should('be.visible');
    cy.get(getFilterValueDataTestSubj('user_name_test')).should('be.visible');
  });

  it('should be able to filter using type filter box', () => {
    cy.get(TYPE_FILTER_BOX).click();
    cy.get(getFilterValueDataTestSubj('Service Usage Technology')).click();
    cy.get(getDataTestSubjectSelector('docTableExpandToggleColumn')).should('have.length', 1);
  });

  it('should be able to filter using name filter box', () => {
    cy.get(NAME_FILTER_BOX).click();
    cy.get(getFilterValueDataTestSubj('user_name_test')).click();
    cy.get(getDataTestSubjectSelector('docTableExpandToggleColumn')).should('have.length', 1);
  });

  it('should be able to filter using id filter box', () => {
    cy.get(ID_FILTER_BOX).click();
    cy.get(getFilterValueDataTestSubj('host_name_test')).click();
    cy.get(getDataTestSubjectSelector('docTableExpandToggleColumn')).should('have.length', 1);
  });
});
