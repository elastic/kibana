/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { login } from '../../../../tasks/login';
import { visitWithTimeRange } from '../../../../tasks/navigation';
import {
  ROW_ADD_NOTES_BUTTON,
  ADD_NOTE_CONTAINER,
  RESOLVER_GRAPH_CONTAINER,
} from '../../../../screens/timeline';
import { OPEN_ANALYZER_BTN } from '../../../../screens/alerts';
import { openTimelineUsingToggle } from '../../../../tasks/security_main';
import { createNewTimeline, executeTimelineSearch } from '../../../../tasks/timeline';
import { ALERTS_URL } from '../../../../urls/navigation';

describe(
  'Timeline row actions',
  {
    tags: ['@ess', '@serverless'],
    env: {
      ftrConfig: {
        kbnServerArgs: [
          `--xpack.securitySolution.enableExperimental=${JSON.stringify([
            'unifiedComponentsInTimelineEnabled',
          ])}`,
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
      cy.get(ROW_ADD_NOTES_BUTTON).should('be.visible').realClick();
      cy.get(ADD_NOTE_CONTAINER).should('be.visible');
    });

    it('should render the analyze event button and display the process analyzer visualization', () => {
      cy.get(OPEN_ANALYZER_BTN).should('be.visible').realClick();
      cy.get(RESOLVER_GRAPH_CONTAINER).should('be.visible');
    });
  }
);
