/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  HOST_DETAILS_FLYOUT_ASSET_CRITICALITY_MODAL_TITLE,
  HOST_DETAILS_FLYOUT_ASSET_CRITICALITY_BUTTON,
  HOST_DETAILS_FLYOUT_ASSET_CRITICALITY_SELECTOR,
  HOST_DETAILS_FLYOUT_SECTION_HEADER,
  toggleAssetCriticalityAccordion,
  toggleAssetCriticalityModal,
  HOST_DETAILS_FLYOUT_ASSET_CRITICALITY_MODAL_SAVE_BTN,
  HOST_DETAILS_FLYOUT_ASSET_CRITICALITY_LEVEL,
  HOST_DETAILS_FLYOUT_ASSET_CRITICALITY_MODAL_DROPDOWN,
} from '../../../../screens/expandable_flyout/host_details_right_panel';
import { deleteAlertsAndRules } from '../../../../tasks/api_calls/common';
import { expandFirstAlertHostExpandableFlyout } from '../../../../tasks/expandable_flyout/common';

import { login } from '../../../../tasks/login';
import { visit } from '../../../../tasks/navigation';
import { createRule } from '../../../../tasks/api_calls/rules';
import { getNewRule } from '../../../../objects/rule';
import { ALERTS_URL } from '../../../../urls/navigation';
import { waitForAlertsToPopulate } from '../../../../tasks/create_new_rule';

describe(
  'Alert host details expandable flyout right panel',
  { tags: ['@ess', '@serverless'] },
  () => {
    const rule = { ...getNewRule(), investigation_fields: { field_names: ['host.os.name'] } };

    beforeEach(() => {
      deleteAlertsAndRules();
      login();
      createRule(rule);
      visit(ALERTS_URL);
      waitForAlertsToPopulate();
      expandFirstAlertHostExpandableFlyout();
    });

    describe('Expandable flyout', () => {
      it('should display header section', () => {
        cy.log('header and content');

        cy.get(HOST_DETAILS_FLYOUT_SECTION_HEADER).should('contain.text', 'Host details');
      });

      it('should display asset criticality accordion', () => {
        cy.log('asset criticality');

        cy.get(HOST_DETAILS_FLYOUT_ASSET_CRITICALITY_SELECTOR).should(
          'contain.text',
          'Asset Criticality'
        );

        toggleAssetCriticalityAccordion();
        cy.get(HOST_DETAILS_FLYOUT_ASSET_CRITICALITY_BUTTON).should('have.text', 'Change');
      });

      it('should display asset criticality modal', () => {
        cy.log('asset criticality modal');

        toggleAssetCriticalityModal();
        cy.get(HOST_DETAILS_FLYOUT_ASSET_CRITICALITY_MODAL_TITLE).should(
          'have.text',
          'Pick asset criticality level'
        );
      });

      it('should update asset criticality state', () => {
        cy.log('asset criticality update');

        toggleAssetCriticalityModal();
        cy.get(HOST_DETAILS_FLYOUT_ASSET_CRITICALITY_MODAL_DROPDOWN)
          .should('be.visible')
          .select('High');

        cy.get(HOST_DETAILS_FLYOUT_ASSET_CRITICALITY_MODAL_SAVE_BTN).should('be.visible').click();
        cy.get(HOST_DETAILS_FLYOUT_ASSET_CRITICALITY_LEVEL).contains('High').should('be.visible');
      });
    });
  }
);
