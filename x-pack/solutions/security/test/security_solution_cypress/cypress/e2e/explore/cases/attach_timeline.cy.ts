/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { login } from '../../../tasks/login';
import { visitTimeline } from '../../../tasks/navigation';
import {
  attachTimelineToNewCase,
  attachTimelineToExistingCase,
  addNewCase,
  selectCase,
  getCasesAttachmentsEnabled,
  createCaseFromTimelineFlyout,
  navigateToCaseFromSuccessToaster,
} from '../../../tasks/timeline';
import { DESCRIPTION_INPUT, ADD_COMMENT_INPUT } from '../../../screens/create_new_case';
import { TIMELINE_CASE_ATTACHMENT_LINK } from '../../../screens/timeline';
import { getCase1 } from '../../../objects/case';
import { getTimeline } from '../../../objects/timeline';
import { createTimeline, deleteTimelines } from '../../../tasks/api_calls/timelines';
import { createCase, deleteCases } from '../../../tasks/api_calls/cases';

const mockTimeline = getTimeline();

// Attaching a timeline to a case behaves differently depending on the
// `xpack.cases.attachments.enabled` feature flag:
//  - flag off: a markdown `[title](url)` link is inserted into the case comment editor.
//  - flag on: a structured `security.timeline` attachment is created on the case.
// Each test reads the runtime flag and asserts the matching behavior.
const expectLegacyTimelineLink = (input: string, timelineId: string, timelineTitle: string) => {
  cy.location('origin').then((origin) => {
    cy.get(input).should(
      'have.text',
      `[${timelineTitle}](${origin}/app/security/timelines?timeline=(id:%27${timelineId}%27,isOpen:!t))`
    );
  });
};

describe('attach timeline to case', { tags: ['@ess', '@serverless'] }, () => {
  context('without cases created', () => {
    beforeEach(() => {
      login();
      deleteTimelines();
      deleteCases();
      createTimeline().then((response) => {
        cy.wrap(response.body).as('myTimeline');
      });
    });

    it('attach timeline to a new case', function () {
      visitTimeline(this.myTimeline.savedObjectId);
      getCasesAttachmentsEnabled().then((attachmentsEnabled) => {
        attachTimelineToNewCase();

        if (attachmentsEnabled) {
          createCaseFromTimelineFlyout();
          navigateToCaseFromSuccessToaster();
          cy.get(TIMELINE_CASE_ATTACHMENT_LINK(this.myTimeline.savedObjectId)).should('exist');
        } else {
          expectLegacyTimelineLink(
            DESCRIPTION_INPUT,
            this.myTimeline.savedObjectId,
            this.myTimeline.title
          );
        }
      });
    });

    it('attach timeline to an existing case with no case', function () {
      visitTimeline(this.myTimeline.savedObjectId);
      getCasesAttachmentsEnabled().then((attachmentsEnabled) => {
        attachTimelineToExistingCase();
        addNewCase();

        if (attachmentsEnabled) {
          createCaseFromTimelineFlyout();
          navigateToCaseFromSuccessToaster();
          cy.get(TIMELINE_CASE_ATTACHMENT_LINK(this.myTimeline.savedObjectId)).should('exist');
        } else {
          expectLegacyTimelineLink(
            DESCRIPTION_INPUT,
            this.myTimeline.savedObjectId,
            this.myTimeline.title
          );
        }
      });
    });
  });

  context('with cases created', () => {
    beforeEach(() => {
      login();
      deleteTimelines();
      deleteCases();
      createTimeline().then((response) => cy.wrap(response.body.savedObjectId).as('timelineId'));
      createCase(getCase1()).then((response) => cy.wrap(response.body.id).as('caseId'));
    });

    it('attach timeline to an existing case', function () {
      visitTimeline(this.timelineId);
      getCasesAttachmentsEnabled().then((attachmentsEnabled) => {
        attachTimelineToExistingCase();
        selectCase(this.caseId);

        if (attachmentsEnabled) {
          navigateToCaseFromSuccessToaster();
          cy.get(TIMELINE_CASE_ATTACHMENT_LINK(this.timelineId)).should('exist');
        } else {
          expectLegacyTimelineLink(ADD_COMMENT_INPUT, this.timelineId, mockTimeline.title);
        }
      });
    });

    it('modal can be re-opened once closed', function () {
      visitTimeline(this.timelineId);
      attachTimelineToExistingCase();
      cy.get('[data-test-subj="all-cases-modal-cancel-button"]').click();

      cy.get('[data-test-subj="all-cases-modal"]').should('not.exist');
      attachTimelineToExistingCase();
      cy.get('[data-test-subj="all-cases-modal"]').should('be.visible');
    });
  });
});
