/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ALL_ASSETS_TITLE,
  DATAGRID_COLUMN_SELECTOR,
  DATAGRID_HEADER,
  DATAGRID_SORTING_SELECTOR,
  FLYOUT_CARDS,
  FLYOUT_RIGHT_PANEL,
  getFilterValueDataTestSubj,
  ID_FILTER_BOX,
  INVESTIGATE_IN_TIMELINE_BUTTON,
  NAME_FILTER_BOX,
  TAKE_ACTION_BUTTON,
  TIMELINE_BODY,
  TYPE_FILTER_BOX,
} from '../../screens/asset_inventory/asset_inventory_page';
import {
  createAssetInventoryMapping,
  createMockAsset,
  createMockEntityV2,
  disableAssetInventory,
  enableAssetInventory,
  installEntityStoreV2ApiCall,
  waitForAssetInventoryReady,
} from '../../tasks/asset_inventory/asset_inventory_page';
import { getDataTestSubjectSelector } from '../../helpers/common';
import { login } from '../../tasks/login';
import { visit } from '../../tasks/navigation';
import { ASSET_INVENTORY_URL } from '../../urls/navigation';
import { postDataView } from '../../tasks/api_calls/common';
import { NO_PRIVILEGES_BOX } from '../../screens/common/page';

// Asset Inventory now reads from the unified Entity Store v2 latest alias
// (`entities-latest-{namespace}`). Tests must enable both the
// `entityAnalyticsEntityStoreV2` server experimental flag and the
// `securitySolution:entityStoreEnableV2` UI setting via kbnServerArgs.
const ASSET_INVENTORY_V2_KBN_SERVER_ARGS = [
  `--xpack.securitySolution.enableExperimental=${JSON.stringify(['entityAnalyticsEntityStoreV2'])}`,
  '--uiSettings.overrides.securitySolution:entityStoreEnableV2=true',
];

const GENERIC_ENTITY_ID =
  '/subscriptions/ef111ee2-6c89-4b09-92c6-5c2321f888df/resourceGroups/cloud-shell-storage-centralindia/providers/Microsoft.Storage/storageAccounts/csg100320021acf35e2/tableServices/default';

type EntityType = 'generic' | 'host' | 'service' | 'user';

interface EntityFixture {
  id: string;
  name: string;
  type: string;
  subType?: string;
}

const ENTITY_FIXTURES: Record<EntityType, EntityFixture> = {
  generic: {
    id: GENERIC_ENTITY_ID,
    name: 'generic_name_test',
    type: 'Service Usage Technology',
    subType: 'Azure Storage Table Service',
  },
  host: { id: 'host_name_test', name: 'host_name_test', type: 'host' },
  service: { id: 'service_name_test', name: 'service_name_test', type: 'service' },
  user: { id: 'user_name_test', name: 'user_name_test', type: 'user' },
};

const buildEntityDoc = (entityType: EntityType): Record<string, unknown> => {
  const fixture = ENTITY_FIXTURES[entityType];
  const now = new Date().toISOString();
  const entity: Record<string, unknown> = {
    id: fixture.id,
    name: fixture.name,
    type: fixture.type,
    EngineMetadata: { Type: entityType },
    category: fixture.type,
  };
  if (fixture.subType) {
    entity.sub_type = fixture.subType;
  }
  // Mirror the typed identifier fields the entity flyout reads ("Host ID" /
  // "Service ID" / "User ID"). Generic docs only need the entity.* shape.
  const typedIdentifier =
    entityType === 'generic' ? {} : { [entityType]: { id: fixture.id, name: fixture.name } };
  return {
    '@timestamp': now,
    entity,
    cloud: { provider: 'azure', service: { name: 'Azure' } },
    event: { ingested: now, kind: 'asset' },
    asset: { criticality: 'low_impact' },
    ...typedIdentifier,
  };
};

describe(
  'Asset Inventory page - uiSetting disabled',
  {
    tags: ['@ess', '@serverless'],
    env: { ftrConfig: { kbnServerArgs: ASSET_INVENTORY_V2_KBN_SERVER_ARGS } },
  },
  () => {
    beforeEach(() => {
      login();
      disableAssetInventory();
      visit(ASSET_INVENTORY_URL);
    });

    it('should navigate user to Security welcome when asset inventory is not enabled', () => {
      // Should navigate user back to Security welcome page
      cy.url().should('include', 'security/get_started');
    });
  }
);

describe(
  'Asset Inventory page - user flyout',
  {
    tags: ['@ess'],
    env: { ftrConfig: { kbnServerArgs: ASSET_INVENTORY_V2_KBN_SERVER_ARGS } },
  },
  () => {
    before(() => {
      // Source data + data view used by the "investigate in timeline" path.
      postDataView('logs*', 'security-solution-default', 'security-solution-default');
      createAssetInventoryMapping('logs-cba');
      createMockAsset('logs-cba');

      // Asset Inventory v2 setup: enable feature, install entity store (creates the
      // `entities-latest-{namespace}` alias), then seed entity docs directly into the
      // underlying latest index so the page reaches the "ready" state without waiting
      // on the live extraction transforms.
      enableAssetInventory();
      installEntityStoreV2ApiCall();
      createMockEntityV2(buildEntityDoc('generic'));
      createMockEntityV2(buildEntityDoc('host'));
      createMockEntityV2(buildEntityDoc('service'));
      createMockEntityV2(buildEntityDoc('user'));
    });

    beforeEach(() => {
      login();
      visit(ASSET_INVENTORY_URL);
      waitForAssetInventoryReady();
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
  }
);
