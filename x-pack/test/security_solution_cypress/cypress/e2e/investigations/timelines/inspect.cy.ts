/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { tag } from '../../../tags';

import { INSPECT_MODAL } from '../../../screens/inspect';

import { login, visit } from '../../../tasks/login';
import { openTimelineUsingToggle } from '../../../tasks/security_main';
import { executeTimelineKQL, openTimelineInspectButton } from '../../../tasks/timeline';

import { HOSTS_URL } from '../../../urls/navigation';

describe('Inspect', { tags: [tag.ESS, tag.SERVERLESS] }, () => {
  context('Timeline', () => {
    it('inspects the timeline', () => {
      const hostExistsQuery = 'host.name: *';
      login();
      visit(HOSTS_URL);
      openTimelineUsingToggle();
      executeTimelineKQL(hostExistsQuery);
      openTimelineInspectButton();
      cy.get(INSPECT_MODAL).should('be.visible');
    });
  });
});
