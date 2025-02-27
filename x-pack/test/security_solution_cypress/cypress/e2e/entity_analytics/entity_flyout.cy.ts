/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ENTRA_ID_PACKAGE_NAME,
  OKTA_PACKAGE_NAME,
} from '@kbn/security-solution-plugin/public/flyout/entity_details/shared/constants';
import {
  expandFirstAlertHostFlyout,
  expandFirstAlertUserFlyout,
  selectAssetCriticalityLevel,
  toggleAssetCriticalityModal,
} from '../../tasks/asset_criticality/common';
import { login } from '../../tasks/login';
import { visitWithTimeRange } from '../../tasks/navigation';
import { ALERTS_URL } from '../../urls/navigation';
import { USER_PANEL_HEADER } from '../../screens/users/flyout_user_panel';
import { waitForAlerts } from '../../tasks/alerts';
import { HOST_PANEL_HEADER } from '../../screens/hosts/flyout_host_panel';
import { RISK_INPUT_PANEL_HEADER, ASSET_CRITICALITY_BADGE } from '../../screens/flyout_risk_panel';
import { expandRiskInputsFlyoutPanel } from '../../tasks/risk_scores/risk_inputs_flyout_panel';
import { mockRiskEngineEnabled } from '../../tasks/entity_analytics';
import { deleteAlertsAndRules } from '../../tasks/api_calls/common';
import {
  ENTITY_DETAILS_FLYOUT_ASSET_CRITICALITY_BUTTON,
  ENTITY_DETAILS_FLYOUT_ASSET_CRITICALITY_LEVEL,
  ENTITY_DETAILS_FLYOUT_ASSET_CRITICALITY_MODAL_TITLE,
  ENTITY_DETAILS_FLYOUT_ASSET_CRITICALITY_SELECTOR,
} from '../../screens/asset_criticality/flyouts';
import { deleteCriticality } from '../../tasks/api_calls/entity_analytics';
import { mockFleetIntegrations } from '../../tasks/fleet_integrations';
import {
  expandManagedDataEntraPanel,
  expandManagedDataOktaPanel,
} from '../../tasks/users/flyout_user_panel';
import {
  ASSET_TYPE_FIELD,
  ENTRA_DOCUMENT_TAB,
  OKTA_DOCUMENT_TAB,
} from '../../screens/users/flyout_asset_panel';

const USER_NAME = 'user1';
const SIEM_KIBANA_HOST_NAME = 'Host-fwarau82er';

describe(
  'Entity Flyout',
  {
    tags: ['@ess', '@serverless'],
    env: {
      ftrConfig: {
        kbnServerArgs: [
          `--xpack.securitySolution.enableExperimental=${JSON.stringify([
            'newUserDetailsFlyoutManagedUser',
          ])}`,
        ],
      },
    },
  },
  () => {
    beforeEach(() => {
      cy.task('esArchiverLoad', { archiveName: 'risk_scores_new_complete_data' });
      cy.task('esArchiverLoad', { archiveName: 'query_alert', useCreate: true, docsOnly: true });
      cy.task('esArchiverLoad', { archiveName: 'user_managed_data' });
      mockRiskEngineEnabled();
      login();
      visitWithTimeRange(ALERTS_URL);
      waitForAlerts();
    });

    afterEach(() => {
      cy.task('esArchiverUnload', { archiveName: 'risk_scores_new_complete_data' });
      cy.task('esArchiverUnload', { archiveName: 'user_managed_data' });
      deleteAlertsAndRules(); // esArchiverUnload doesn't work properly when using with `useCreate` and `docsOnly` flags
      deleteCriticality({ idField: 'host.name', idValue: SIEM_KIBANA_HOST_NAME });
      deleteCriticality({ idField: 'user.name', idValue: USER_NAME });
    });

    describe('User details', () => {
      it('should display entity flyout and open risk input panel', () => {
        expandFirstAlertUserFlyout();

        cy.log('header section');
        cy.get(USER_PANEL_HEADER).should('contain.text', USER_NAME);

        cy.log('risk input');
        expandRiskInputsFlyoutPanel();
        cy.get(RISK_INPUT_PANEL_HEADER).should('exist');
      });

      describe('Asset criticality', () => {
        it('should show asset criticality in the risk input panel', () => {
          expandFirstAlertUserFlyout();
          expandRiskInputsFlyoutPanel();
          cy.get(ASSET_CRITICALITY_BADGE).should('contain.text', 'Extreme Impact');
        });

        it('should display asset criticality accordion', () => {
          cy.log('asset criticality');
          expandFirstAlertUserFlyout();
          cy.get(ENTITY_DETAILS_FLYOUT_ASSET_CRITICALITY_SELECTOR).should(
            'contain.text',
            'Asset Criticality'
          );

          cy.get(ENTITY_DETAILS_FLYOUT_ASSET_CRITICALITY_BUTTON).should('have.text', 'Assign');
        });

        it('should display asset criticality modal', () => {
          cy.log('asset criticality modal');
          expandFirstAlertUserFlyout();
          toggleAssetCriticalityModal();
          cy.get(ENTITY_DETAILS_FLYOUT_ASSET_CRITICALITY_MODAL_TITLE).should(
            'have.text',
            'Change asset criticality'
          );
        });

        it('should update asset criticality state', () => {
          cy.log('asset criticality update');
          expandFirstAlertUserFlyout();
          selectAssetCriticalityLevel('High Impact');
          cy.get(ENTITY_DETAILS_FLYOUT_ASSET_CRITICALITY_LEVEL)
            .contains('High Impact')
            .should('be.visible');
        });
        it('should unassign asset criticality state', () => {
          cy.log('asset criticality update');
          expandFirstAlertUserFlyout();
          selectAssetCriticalityLevel('High Impact');
          cy.get(ENTITY_DETAILS_FLYOUT_ASSET_CRITICALITY_LEVEL)
            .contains('High Impact')
            .should('be.visible');
          selectAssetCriticalityLevel('Unassigned');
          cy.get(ENTITY_DETAILS_FLYOUT_ASSET_CRITICALITY_LEVEL)
            .contains('Unassigned')
            .should('be.visible');
        });
      });

      // https://github.com/elastic/kibana/issues/179248
      describe('Managed data section', { tags: ['@skipInServerlessMKI'] }, () => {
        beforeEach(() => {
          mockFleetIntegrations([
            {
              package_name: ENTRA_ID_PACKAGE_NAME,
              package_title: 'azure entra',
              latest_package_version: 'test_package_version',
              installed_package_version: 'test_package_version',
              is_installed: true,
              is_enabled: true,
            },
            {
              package_name: OKTA_PACKAGE_NAME,
              package_title: 'okta',
              latest_package_version: 'test_package_version',
              installed_package_version: 'test_package_version',
              is_installed: true,
              is_enabled: true,
            },
          ]);
        });

        it('should show okta and azure managed data sections and expand panel', () => {
          expandFirstAlertUserFlyout();

          expandManagedDataEntraPanel();
          cy.get(ENTRA_DOCUMENT_TAB).should('have.attr', 'aria-selected');
          cy.get(ASSET_TYPE_FIELD).should('contain.text', 'microsoft_entra_id_user');

          expandManagedDataOktaPanel();
          cy.get(OKTA_DOCUMENT_TAB).should('have.attr', 'aria-selected');
          cy.get(ASSET_TYPE_FIELD).should('contain.text', 'okta_user');
        });
      });
    });

    describe('Host details', () => {
      it('should display entity flyout and open risk input panel', () => {
        expandFirstAlertHostFlyout();

        cy.log('header section');
        cy.get(HOST_PANEL_HEADER).should('contain.text', SIEM_KIBANA_HOST_NAME);

        cy.log('risk input');
        expandRiskInputsFlyoutPanel();
        cy.get(RISK_INPUT_PANEL_HEADER).should('exist');
      });

      it('should show asset criticality in the risk input panel', () => {
        expandFirstAlertHostFlyout();
        expandRiskInputsFlyoutPanel();
        cy.get(ASSET_CRITICALITY_BADGE).should('contain.text', 'Extreme Impact');
      });

      it('should display asset criticality accordion', () => {
        cy.log('asset criticality');
        expandFirstAlertHostFlyout();
        cy.get(ENTITY_DETAILS_FLYOUT_ASSET_CRITICALITY_SELECTOR).should(
          'contain.text',
          'Asset Criticality'
        );

        cy.get(ENTITY_DETAILS_FLYOUT_ASSET_CRITICALITY_BUTTON).should('have.text', 'Assign');
      });

      it('should display asset criticality modal', () => {
        cy.log('asset criticality modal');
        expandFirstAlertHostFlyout();
        toggleAssetCriticalityModal();
        cy.get(ENTITY_DETAILS_FLYOUT_ASSET_CRITICALITY_MODAL_TITLE).should(
          'have.text',
          'Change asset criticality'
        );
      });

      it('should update asset criticality state', () => {
        cy.log('asset criticality update');
        expandFirstAlertHostFlyout();
        selectAssetCriticalityLevel('High Impact');
        cy.get(ENTITY_DETAILS_FLYOUT_ASSET_CRITICALITY_LEVEL)
          .contains('High Impact')
          .should('be.visible');
      });
    });
  }
);
