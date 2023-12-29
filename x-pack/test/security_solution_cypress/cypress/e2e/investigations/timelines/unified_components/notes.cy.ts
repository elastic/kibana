/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { NOTES_PREVIEWS } from '../../../../screens/timeline';
import { addNotesToEvents, deleteNote, populateTimeline } from '../../../../tasks/timeline';
import { ALERTS_URL } from '../../../../urls/navigation';
import { login } from '../../../../tasks/login';
import { visitWithTimeRange } from '../../../../tasks/navigation';
import { openTimelineUsingToggle } from '../../../../tasks/security_main';

describe(
  'Query Tab Notes',
  {
    tags: ['@ess', '@serverless'],
    env: {
      ftrConfig: {
        kbnServerArgs: [
          `--xpack.securitySolution.enableExperimental=${JSON.stringify([
            'useDiscoverInTimeline',
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
      populateTimeline();
    });

    it('should be able to add/delete notes', () => {
      const notesToAdd = ['First Note', 'Second Note'];
      for (const note of notesToAdd) {
        cy.log(`Add note - ${note}`);
        addNotesToEvents(0, note);
      }
      deleteNote(0);
      cy.get(NOTES_PREVIEWS).eq(0).should('contain.text', notesToAdd[1]);
    });
  }
);
