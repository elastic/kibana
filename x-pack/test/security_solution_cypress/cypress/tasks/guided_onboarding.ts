/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ATTACH_TO_NEW_CASE_BUTTON, TAKE_ACTION_BTN } from '../screens/alerts';
import { createCase } from './create_new_case';
import {
  NEXT_STEP_BUTTON,
  GLOBAL_TOUR_BUTTON,
  ALERTS_STEP_GUIDE_BUTTON,
  COMPLETION_POPOVER,
  COMPLETE_SIEM_GUIDE_BUTTON,
  CLOSE_CREATE_CASE_FLYOUT,
} from '../screens/guided_onboarding';
import { expandFirstAlert } from './alerts';

export const goToNextStep = (currentStep: number) => {
  cy.get(
    `[data-test-subj="tourStepAnchor-alertsCases-${currentStep}"] ${NEXT_STEP_BUTTON}`
  ).click();
};

export const startTour = () => {
  cy.get(GLOBAL_TOUR_BUTTON).click();
  cy.get(ALERTS_STEP_GUIDE_BUTTON).click();
};

export const finishTour = () => {
  cy.get(COMPLETION_POPOVER).should('exist');
  cy.get(GLOBAL_TOUR_BUTTON).click();
  cy.get(ALERTS_STEP_GUIDE_BUTTON).click();
  cy.get(COMPLETE_SIEM_GUIDE_BUTTON).click();
};

export const completeTourWithNextButton = () => {
  for (let i = 1; i < 6; i++) {
    goToNextStep(i);
  }
  createCase();
  goToNextStep(7);
};

export const addToCase = () => {
  cy.get(TAKE_ACTION_BTN).click();
  cy.get(ATTACH_TO_NEW_CASE_BUTTON).click();
};

export const completeTourWithActions = () => {
  goToNextStep(1);
  expandFirstAlert();
  goToNextStep(3);
  addToCase();
  goToNextStep(5);
  createCase();
  goToNextStep(7);
};

export const goToStep = (step: number) => {
  for (let i = 1; i < 6; i++) {
    if (i === step) {
      break;
    }
    goToNextStep(i);
  }
  if (step === 7) {
    createCase();
  }
};

export const assertTourStepExist = (step: number) =>
  cy.get(`[data-test-subj="tourStepAnchor-alertsCases-${step}"]`).should('exist');

export const assertTourStepNotExist = (step: number) =>
  cy.get(`[data-test-subj="tourStepAnchor-alertsCases-${step}"]`).should('not.exist');

export const closeCreateCaseFlyout = () => cy.get(CLOSE_CREATE_CASE_FLYOUT).click();
