/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getDataTestSubjectSelector } from '../../helpers/common';
import { login } from '../../tasks/login';
import { visit } from '../../tasks/navigation';
import { ASSET_INVENTORY_URL } from '../../urls/navigation';

const NO_PRIVILEGES_BOX = getDataTestSubjectSelector('noPrivilegesPage');
const ALL_ASSETS_TITLE = getDataTestSubjectSelector('all-assets-title');

describe(
  'Asset Inventory page - uiSetting disabled',
  {
    tags: ['@ess'],
  },
  () => {
    beforeEach(() => {
      login();
      visit(ASSET_INVENTORY_URL);
    });

    it('should display Privileges Required box', () => {
      cy.get(NO_PRIVILEGES_BOX).should('be.visible');
      cy.get(ALL_ASSETS_TITLE).should('not.be.visible');
    });
  }
);

describe(
  'Asset Inventory page - uiSetting enabled',
  {
    env: {
      ftrConfig: {
        kbnServerArgs: ['--uiSettings.overrides.securitySolution:enableAssetInventory=true'],
      },
    },
    tags: ['@ess'],
  },
  () => {
    beforeEach(() => {
      login();
      visit(ASSET_INVENTORY_URL);
    });

    it('should display All assets title', () => {
      cy.get(NO_PRIVILEGES_BOX).should('not.be.visible');
      cy.get(ALL_ASSETS_TITLE).should('be.visible');
    });
  }
);
