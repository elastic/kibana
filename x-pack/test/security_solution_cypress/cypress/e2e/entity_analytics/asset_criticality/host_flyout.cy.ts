/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getNewRule } from '../../../objects/rule';
import {
  HOST_DETAILS_FLYOUT_SECTION_HEADER,
  HOST_DETAILS_FLYOUT_ASSET_CRITICALITY_SELECTOR,
  HOST_DETAILS_FLYOUT_ASSET_CRITICALITY_BUTTON,
  HOST_DETAILS_FLYOUT_ASSET_CRITICALITY_MODAL_TITLE,
  HOST_DETAILS_FLYOUT_ASSET_CRITICALITY_LEVEL,
} from '../../../screens/asset_criticality/flyouts';
import { deleteAlertsAndRules } from '../../../tasks/api_calls/common';
import {
  expandFirstAlertHostFlyout,
  selectAssetCriticalityLevel,
  toggleAssetCriticalityAccordion,
  toggleAssetCriticalityModal,
} from '../../../tasks/asset_criticality/common';
import { createRule } from '../../../tasks/api_calls/rules';
import { waitForAlertsToPopulate } from '../../../tasks/create_new_rule';
import { login } from '../../../tasks/login';
import { visit } from '../../../tasks/navigation';
import { ALERTS_URL } from '../../../urls/navigation';

describe(
  'Host details flyout',
  {
    tags: ['@ess', '@serverless'],
    env: {
      ftrConfig: {
        kbnServerArgs: [
          `--xpack.securitySolution.enableExperimental=${JSON.stringify([
            'entityAnalyticsAssetCriticalityEnabled',
          ])}`,
        ],
      },
    },
  },
  () => {
    const rule = { ...getNewRule(), investigation_fields: { field_names: ['host.os.name'] } };

    beforeEach(() => {
      deleteAlertsAndRules();
      login();
      createRule(rule);
      visit(ALERTS_URL);
      waitForAlertsToPopulate();
      expandFirstAlertHostFlyout();
    });

    describe('Host flyout', () => {
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
        cy.get(HOST_DETAILS_FLYOUT_ASSET_CRITICALITY_BUTTON).should('have.text', 'Create');
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

        selectAssetCriticalityLevel('Important');
        cy.get(HOST_DETAILS_FLYOUT_ASSET_CRITICALITY_LEVEL)
          .contains('Important')
          .should('be.visible');
      });
    });
  }
);
