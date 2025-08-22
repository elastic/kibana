/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elementsOverlap } from '../../../helpers/rules';
import {
  TIMELINE_ROW_RENDERERS_SEARCHBOX,
  TIMELINE_SHOW_ROW_RENDERERS_GEAR,
  TIMELINE_ROW_RENDERERS_SURICATA_SIGNATURE,
  TIMELINE_ROW_RENDERERS_SURICATA_SIGNATURE_TOOLTIP,
  TIMELINE_ROW_RENDERERS_SURICATA_LINK_TOOLTIP,
} from '../../../screens/timeline';
import { deleteTimelines } from '../../../tasks/api_calls/timelines';
import { waitForWelcomePanelToBeLoaded } from '../../../tasks/common';
import { waitForAllHostsToBeLoaded } from '../../../tasks/hosts/all_hosts';

import { login } from '../../../tasks/login';
import { visitWithTimeRange } from '../../../tasks/navigation';
import { openTimelineUsingToggle } from '../../../tasks/security_main';
import { populateTimeline } from '../../../tasks/timeline';

import { hostsUrl } from '../../../urls/navigation';

describe('Row renderers - Suricata', { tags: ['@ess', '@serverless'] }, () => {
  before(() => {
    cy.task('esArchiverLoad', { archiveName: 'bulk_process' });
  });

  after(() => {
    cy.task('esArchiverUnload', { archiveName: 'bulk_process' });
  });
  beforeEach(() => {
    deleteTimelines();
    login();
    visitWithTimeRange(hostsUrl('allHosts'), {
      visitOptions: {
        onLoad: () => {
          waitForWelcomePanelToBeLoaded();
          waitForAllHostsToBeLoaded();
        },
      },
    });
    openTimelineUsingToggle();
    populateTimeline();
  });

  it('Signature tooltips do not overlap', () => {
    // Hover the signature to show the tooltips
    cy.get(TIMELINE_SHOW_ROW_RENDERERS_GEAR).realClick();
    cy.get(TIMELINE_ROW_RENDERERS_SEARCHBOX).should('exist');
    cy.get(TIMELINE_ROW_RENDERERS_SEARCHBOX).type('suricata');

    cy.get(TIMELINE_ROW_RENDERERS_SURICATA_SIGNATURE, { timeout: 3000 }).realHover();

    cy.get(TIMELINE_ROW_RENDERERS_SURICATA_LINK_TOOLTIP).then(($googleLinkTooltip) => {
      cy.get(TIMELINE_ROW_RENDERERS_SURICATA_SIGNATURE_TOOLTIP).then(($signatureTooltip) => {
        expect(
          elementsOverlap($googleLinkTooltip, $signatureTooltip),
          'tooltips do not overlap'
        ).to.equal(false);
      });
    });
  });
});
