/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  INSPECT_BUTTONS_IN_SECURITY,
  INSPECT_MODAL,
  INSPECT_MODAL_INDEX_PATTERN,
} from '../../../screens/inspect';
import {
  closesModal,
  openLensVisualizationsInspectModal,
  openTab,
  openTableInspectModal,
} from '../../../tasks/inspect';
import { login } from '../../../tasks/login';
import { visitWithTimeRange } from '../../../tasks/navigation';
import { waitForWelcomePanelToBeLoaded } from '../../../tasks/common';
import { selectDataView } from '../../../tasks/sourcerer';
import { postDataView } from '../../../tasks/api_calls/common';

const DATA_VIEW = 'auditbeat-*';

// FLAKY: https://github.com/elastic/kibana/issues/178367
describe.skip(
  'Inspect Explore pages',
  { tags: ['@ess', '@serverless', '@skipInServerlessMKI'] },
  () => {
    before(() => {
      // illegal_argument_exception: unknown setting [index.lifecycle.name]
      cy.task('esArchiverLoad', { archiveName: 'risk_users' });
      cy.task('esArchiverLoad', { archiveName: 'risk_hosts' });

      login();
      // Create and select data view
      postDataView(DATA_VIEW);
    });

    after(() => {
      cy.task('esArchiverUnload', { archiveName: 'risk_users' });
      cy.task('esArchiverUnload', { archiveName: 'risk_hosts' });
    });

    INSPECT_BUTTONS_IN_SECURITY.forEach(({ pageName, url, lensVisualizations, tables }) => {
      /**
       * Group all tests of a page into one "it" call to improve speed
       */
      it(`inspect ${pageName} page`, () => {
        login();

        visitWithTimeRange(url, {
          visitOptions: {
            onLoad: () => {
              waitForWelcomePanelToBeLoaded();
              selectDataView(DATA_VIEW);
            },
          },
        });

        lensVisualizations.forEach((lens) => {
          cy.log(`inspects the ${lens.title} visualization`);
          openTab(lens.tab);

          openLensVisualizationsInspectModal(lens, () => {
            cy.get(INSPECT_MODAL).should('be.visible');
            cy.get(INSPECT_MODAL_INDEX_PATTERN).should(
              'contain.text',
              lens.customIndexPattern ? lens.customIndexPattern : DATA_VIEW
            );
          });
        });

        tables.forEach((table) => {
          cy.log(`inspects the ${table.title}`);
          openTab(table.tab);

          openTableInspectModal(table);
          cy.get(INSPECT_MODAL).should('be.visible');
          cy.get(INSPECT_MODAL_INDEX_PATTERN).should(
            'contain.text',
            table.customIndexPattern ? table.customIndexPattern : DATA_VIEW
          );

          closesModal();
        });
      });
    });
  }
);
