/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint @kbn/imports/no_unresolvable_imports: 0 */

import { login } from '../../tasks/login';
import { visitWithTimeRange } from '../../tasks/navigation';
import { ATTACK_DISCOVERY_URL } from '../../urls/navigation';

// TODO: Migrate to use Kibana Connectors API
// @ts-expect-error
import kibanaDevConfig from '../../../../../../config/kibana.dev.yml';

describe(
  'Attack discovery',
  {
    tags: [],
    env: {
      devConfig: true,
      ftrConfig: {
        kbnServerArgs: [
          `--xpack.securitySolution.enableExperimental=${JSON.stringify([
            'attackDiscoveryEnabled',
          ])}`,
        ],
      },
    },
  },
  async () => {
    before(() => {
      cy.task('loadAttackDiscoveryData');
    });

    beforeEach(() => {
      login();
      visitWithTimeRange(ATTACK_DISCOVERY_URL);
    });

    it.each(Object.keys(kibanaDevConfig['xpack.actions.preconfigured']))('%s', (connectorId) => {
      cy.get('[data-test-subj="connectorSelectorPlaceholderButton"]').click();
      cy.get(`[data-test-subj="${connectorId}"]`).click();
      cy.get('[data-test-subj="generate"]').first().click();
      cy.get('[data-test-subj="attackDiscoveryGenerationInProgress"]').should('exist');
      cy.get('[data-test-subj="attackDiscoveryGenerationInProgress"]', {
        timeout: 600000,
      }).should('not.exist');
      cy.get('[data-test-subj="entityButton"]').should('not.contain', '{');
    });
  }
);
