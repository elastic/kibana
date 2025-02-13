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

const ALL_ASSETS_TITLE = getDataTestSubjectSelector('all-assets-title');

describe(
  'Asset Inventory page',
  {
    env: {
      ftrConfig: {
        kbnServerArgs: [
          `--xpack.securitySolution.enableExperimental=${JSON.stringify([
            'assetInventoryUXEnabled',
          ])}`,
        ],
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
      cy.get(ALL_ASSETS_TITLE).should('be.visible');
    });
  }
);
