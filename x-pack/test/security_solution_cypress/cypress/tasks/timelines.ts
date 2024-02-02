/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  BULK_ACTIONS,
  EXPORT_TIMELINE,
  TIMELINE_CHECKBOX,
  EXPORT_TIMELINE_ACTION,
  TIMELINES_TABLE,
  TIMELINE,
  TIMELINE_NAME,
  TIMELINE_ITEM_ACTION_BTN,
} from '../screens/timelines';
import { SELECT_ALL_CHECKBOX } from '../screens/shared';

export const openTimeline = (id?: string) => {
  cy.get(id ? TIMELINE(id) : TIMELINE_NAME).click();
};

export const waitForTimelinesPanelToBeLoaded = () => {
  cy.get(TIMELINES_TABLE).should('exist');
};

export const exportTimeline = (timelineId: string) => {
  cy.get(TIMELINE_ITEM_ACTION_BTN(timelineId)).click();
  cy.get(EXPORT_TIMELINE).click();
};

export const selectTimeline = (timelineId: string) => {
  cy.get(TIMELINE_CHECKBOX(timelineId)).click();
};

export const selectAllTimelines = () => {
  cy.get(SELECT_ALL_CHECKBOX).click();
};

export const exportSelectedTimelines = () => {
  cy.get(BULK_ACTIONS).click();
  cy.get(EXPORT_TIMELINE_ACTION).should('not.be.disabled');
  cy.get(EXPORT_TIMELINE_ACTION).click();
};
