/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  FILE_PICKER,
  INVALID_LINES_MESSAGE,
  PAGE_TITLE,
  RESULT_STEP,
  VALID_LINES_MESSAGE,
} from '../../screens/asset_criticality';
import { enableAssetCriticality } from '../../tasks/api_calls/kibana_advanced_settings';
import { clickAssignButton, uploadAssetCriticalityFile } from '../../tasks/asset_criticality';
import { login } from '../../tasks/login';
import { visit } from '../../tasks/navigation';
import { ENTITY_ANALYTICS_ASSET_CRITICALITY_URL } from '../../urls/navigation';

describe(
  'Asset Criticality Upload page',
  {
    tags: ['@ess'],
  },
  () => {
    beforeEach(() => {
      login();
      enableAssetCriticality();
      visit(ENTITY_ANALYTICS_ASSET_CRITICALITY_URL);
    });

    it('renders page as expected', () => {
      cy.get(PAGE_TITLE).should('have.text', 'Asset criticality');
    });

    it('uploads a file', () => {
      uploadAssetCriticalityFile();

      cy.get(FILE_PICKER).should('not.visible');
      cy.get(VALID_LINES_MESSAGE).should('have.text', '4 asset criticalities will be assigned');
      cy.get(INVALID_LINES_MESSAGE).should('have.text', "1 line is invalid and won't be assigned");

      clickAssignButton();

      cy.get(RESULT_STEP).should('be.visible');
    });
  }
);
