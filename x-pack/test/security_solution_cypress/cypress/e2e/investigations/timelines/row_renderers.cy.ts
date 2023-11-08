/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elementsOverlap } from '../../../helpers/rules';
import {
  TIMELINE_ROW_RENDERERS_DISABLE_ALL_BTN,
  TIMELINE_ROW_RENDERERS_MODAL_ITEMS_CHECKBOX,
  TIMELINE_ROW_RENDERERS_SEARCHBOX,
  TIMELINE_SHOW_ROW_RENDERERS_GEAR,
  TIMELINE_ROW_RENDERERS_SURICATA_SIGNATURE,
  TIMELINE_ROW_RENDERERS_SURICATA_SIGNATURE_TOOLTIP,
  TIMELINE_ROW_RENDERERS_SURICATA_LINK_TOOLTIP,
  TIMELINE_ROW_RENDERERS_MODAL_CLOSE_BUTTON,
} from '../../../screens/timeline';
import { deleteTimelines, waitForWelcomePanelToBeLoaded } from '../../../tasks/common';
import { waitForAllHostsToBeLoaded } from '../../../tasks/hosts/all_hosts';

import { login } from '../../../tasks/login';
import { visitWithTimeRange } from '../../../tasks/navigation';
import { openTimelineUsingToggle } from '../../../tasks/security_main';
import { addNameToTimelineAndSave, populateTimeline, saveTimeline } from '../../../tasks/timeline';

import { hostsUrl } from '../../../urls/navigation';

describe('Row renderers', { tags: ['@ess', '@serverless'] }, () => {
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
    cy.get(TIMELINE_SHOW_ROW_RENDERERS_GEAR).should('exist');
    cy.get(TIMELINE_SHOW_ROW_RENDERERS_GEAR).first().click({ force: true });
  });

  it('Row renderers should be enabled by default', () => {
    cy.get(TIMELINE_ROW_RENDERERS_MODAL_ITEMS_CHECKBOX).should('exist');
    cy.get(TIMELINE_ROW_RENDERERS_MODAL_ITEMS_CHECKBOX).should('be.checked');
  });

  it('Selected renderer can be disabled and enabled', () => {
    cy.get(TIMELINE_ROW_RENDERERS_SEARCHBOX).should('exist');
    cy.get(TIMELINE_ROW_RENDERERS_SEARCHBOX).type('flow');

    // Intercepts should be before click handlers that activate them rather than afterwards or you have race conditions
    cy.intercept('PATCH', '/api/timeline', (req) => {
      if (req.body.timeline.excludedRowRendererIds.includes('netflow')) {
        req.alias = 'excludedNetflow';
      } else {
        req.alias = 'includedNetflow';
      }
    });
    cy.get(TIMELINE_ROW_RENDERERS_MODAL_ITEMS_CHECKBOX).first().uncheck();

    // close modal and save timeline changes
    cy.get(TIMELINE_ROW_RENDERERS_MODAL_CLOSE_BUTTON).click();
    addNameToTimelineAndSave('Test');

    cy.wait('@excludedNetflow').then((interception) => {
      expect(
        interception?.response?.body.data.persistTimeline.timeline.excludedRowRendererIds
      ).to.contain('netflow');
    });

    // open modal, filter and check
    cy.get(TIMELINE_SHOW_ROW_RENDERERS_GEAR).first().click({ force: true });

    cy.get(TIMELINE_ROW_RENDERERS_SEARCHBOX).type('flow');
    cy.get(TIMELINE_ROW_RENDERERS_MODAL_ITEMS_CHECKBOX).first().check();

    // close modal and save timeline changes
    cy.get(TIMELINE_ROW_RENDERERS_MODAL_CLOSE_BUTTON).click();
    saveTimeline();

    cy.wait('@includedNetflow').then((interception) => {
      expect(
        interception?.response?.body.data.persistTimeline.timeline.excludedRowRendererIds
      ).not.to.contain('netflow');
    });
  });

  it('Selected renderer can be disabled with one click', () => {
    // Ensure these elements are visible before continuing since sometimes it takes a second for the modal to show up
    // and it gives the click handlers a bit of time to be initialized as well to reduce chances of flake
    cy.get(TIMELINE_ROW_RENDERERS_DISABLE_ALL_BTN).should('exist');
    cy.get(TIMELINE_ROW_RENDERERS_MODAL_ITEMS_CHECKBOX).should('be.checked');

    // Intercepts should be before click handlers that activate them rather than afterwards or you have race conditions
    cy.intercept('PATCH', '/api/timeline').as('updateTimeline');

    cy.get(TIMELINE_ROW_RENDERERS_DISABLE_ALL_BTN).click();

    cy.get(TIMELINE_ROW_RENDERERS_MODAL_ITEMS_CHECKBOX).first().should('not.be.checked');

    cy.get(TIMELINE_ROW_RENDERERS_MODAL_CLOSE_BUTTON).click();

    addNameToTimelineAndSave('Test');

    cy.wait('@updateTimeline').its('response.statusCode').should('eq', 200);
  });

  describe('Suricata', () => {
    // This test has become very flaky over time and was blocking a lot of PRs.
    // A follw-up ticket to tackle this issue has been created.
    it.skip('Signature tooltips do not overlap', () => {
      // Hover the signature to show the tooltips
      cy.get(TIMELINE_ROW_RENDERERS_SURICATA_SIGNATURE).parents('.euiPopover__anchor').realHover();

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
});
