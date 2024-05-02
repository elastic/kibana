/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { login } from '../../../../tasks/login';
import { visitWithTimeRange } from '../../../../tasks/navigation';
import { openTimelineUsingToggle } from '../../../../tasks/security_main';
import { createNewTimeline, executeTimelineSearch } from '../../../../tasks/timeline';
import { ALERTS_URL } from '../../../../urls/navigation';

describe(
  'Timeline row actions',
  {
    tags: ['@ess', '@serverless', '@skipInServerlessMKI'],
    env: {
      ftrConfig: {
        kbnServerArgs: [
          `--xpack.securitySolution.enableExperimental=${JSON.stringify([
            'unifiedComponentsInTimelineEnabled',
          ])}`,
          '--uiSettings.overrides={"theme:darkMode":true}',
        ],
      },
    },
  },
  () => {
    beforeEach(() => {
      login();
      visitWithTimeRange(ALERTS_URL);
      openTimelineUsingToggle();
      createNewTimeline();
      executeTimelineSearch('*');
    });

    it('should render the add note button and display the markdown editor', () => {
      cy.get('[data-test-subj="timeline-notes-button-small"]').should('be.visible');
      cy.get('[data-test-subj="timeline-notes-button-small"]').click();
      cy.get('[data-test-subj="add-note-container"]').should('be.visible');
    });

    it('should render the analyze event button and display the process analyzer visualization', () => {
      cy.get('[data-test-subj="view-in-analyzer"]').should('be.visible');
      cy.get('[data-test-subj="view-in-analyzer"]').click();
      cy.get('[data-test-subj="resolver:graph"]').should('be.visible');
    });
  }
);
