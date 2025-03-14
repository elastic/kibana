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

const NO_PRIVILEGES_BOX = getDataTestSubjectSelector('noPrivilegesPage');
const ALL_ASSETS_TITLE = getDataTestSubjectSelector('asset-inventory-test-subj-page-title');

const disableAssetInventory = () => {
  setKibanaSetting(SECURITY_SOLUTION_ENABLE_ASSET_INVENTORY_SETTING, false);
};

const enableAssetInventory = () => {
  setKibanaSetting(SECURITY_SOLUTION_ENABLE_ASSET_INVENTORY_SETTING, true);
};

describe('Asset Inventory page - uiSetting disabled', { tags: ['@ess', '@serverless'] }, () => {
  beforeEach(() => {
    login();
    disableAssetInventory();
    visit(ASSET_INVENTORY_URL);
  });

  it('should display Privileges Required box', () => {
    cy.get(NO_PRIVILEGES_BOX).should('be.visible');
    cy.get(ALL_ASSETS_TITLE).should('not.exist');
  });
});

describe('Asset Inventory page - uiSetting enabled', { tags: ['@ess', '@serverless'] }, () => {
  beforeEach(() => {
    login();
    enableAssetInventory();
    visit(ASSET_INVENTORY_URL);
  });

  it('should display All assets title', () => {
    cy.get(NO_PRIVILEGES_BOX).should('not.exist');
    cy.get(ALL_ASSETS_TITLE).should('be.visible');
  });
});
