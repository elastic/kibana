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
import { clickAssignButton, uploadAssetCriticalityFile } from '../../tasks/asset_criticality';
import { login } from '../../tasks/login';
import { visit } from '../../tasks/navigation';
import { ENTITY_ANALYTICS_ASSET_CRITICALITY_URL } from '../../urls/navigation';

// Failing: See https://github.com/elastic/kibana/issues/196563
// Failing: See https://github.com/elastic/kibana/issues/196563
describe.skip(
  'Asset Criticality Upload page',
  {
    tags: ['@ess'],
  },
  () => {
    beforeEach(() => {
      login();
      visit(ENTITY_ANALYTICS_ASSET_CRITICALITY_URL);
    });

    it('renders page as expected', () => {
      cy.get(PAGE_TITLE).should('include.text', 'Entity Store');
    });

    it('uploads a file', () => {
      uploadAssetCriticalityFile();

      cy.get(FILE_PICKER).should('not.visible');
      cy.get(VALID_LINES_MESSAGE).should(
        'have.text',
        '4 asset criticality levels will be assigned'
      );
      cy.get(INVALID_LINES_MESSAGE).should('have.text', "1 line is invalid and won't be assigned");

      clickAssignButton();

      cy.get(RESULT_STEP).should('be.visible');
    });
  }
);
