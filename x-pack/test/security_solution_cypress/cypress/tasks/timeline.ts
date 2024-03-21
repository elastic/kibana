/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { recurse } from 'cypress-recurse';
import type { Timeline, TimelineFilter } from '../objects/timeline';

import { ALL_CASES_CREATE_NEW_CASE_TABLE_BTN } from '../screens/all_cases';
import { FIELDS_BROWSER_CHECKBOX } from '../screens/fields_browser';
import { EQL_QUERY_VALIDATION_SPINNER } from '../screens/create_new_rule';

import {
  ADD_FILTER,
  ADD_NOTE_BUTTON,
  ATTACH_TIMELINE_TO_CASE_BUTTON,
  ATTACH_TIMELINE_TO_EXISTING_CASE_ICON,
  ATTACH_TIMELINE_TO_NEW_CASE_ICON,
  CLOSE_TIMELINE_BTN,
  COMBO_BOX_INPUT,
  CREATE_NEW_TIMELINE,
  FIELD_BROWSER,
  ID_HEADER_FIELD,
  ID_TOGGLE_FIELD,
  ID_HOVER_ACTION_OVERFLOW_BTN,
  NOTES_TAB_BUTTON,
  NOTES_TEXT_AREA,
  OPEN_TIMELINE_ICON,
  PIN_EVENT,
  RESET_FIELDS,
  SAVE_FILTER_BTN,
  SEARCH_OR_FILTER_CONTAINER,
  SELECT_CASE,
  SERVER_SIDE_EVENT_COUNT,
  STAR_ICON,
  TIMELINE_DESCRIPTION_INPUT,
  TIMELINE_FIELDS_BUTTON,
  TIMELINE_FILTER_FIELD,
  TIMELINE_FILTER_OPERATOR,
  TIMELINE_FILTER_VALUE,
  TIMELINE_INSPECT_BUTTON,
  TIMELINE_TITLE_INPUT,
  TIMELINE_TITLE_BY_ID,
  TIMESTAMP_TOGGLE_FIELD,
  TOGGLE_TIMELINE_EXPAND_EVENT,
  TIMELINE_SAVE_MODAL,
  TIMELINE_SAVE_MODAL_SAVE_BUTTON,
  TIMELINE_SAVE_MODAL_SAVE_AS_NEW_SWITCH,
  TIMELINE_PROGRESS_BAR,
  QUERY_TAB_BUTTON,
  TIMELINE_ADD_FIELD_BUTTON,
  TIMELINE_DATA_PROVIDER_FIELD,
  TIMELINE_DATA_PROVIDER_OPERATOR,
  TIMELINE_DATA_PROVIDER_VALUE,
  SAVE_DATA_PROVIDER_BTN,
  TIMELINE_CORRELATION_INPUT,
  TIMELINE_CORRELATION_TAB,
  TIMELINE_CREATE_TIMELINE_FROM_TEMPLATE_BTN,
  TIMELINE_CREATE_TEMPLATE_FROM_TIMELINE_BTN,
  TIMELINE_COLLAPSED_ITEMS_BTN,
  TIMELINE_TAB_CONTENT_EQL,
  TIMESTAMP_HOVER_ACTION_OVERFLOW_BTN,
  ACTIVE_TIMELINE_BOTTOM_BAR,
  EMPTY_DATA_PROVIDER_AREA,
  EMPTY_DROPPABLE_DATA_PROVIDER_GROUP,
  GET_TIMELINE_GRID_CELL,
  HOVER_ACTIONS,
  TIMELINE_SWITCHQUERYLANGUAGE_BUTTON,
  TIMELINE_SHOWQUERYBARMENU_BUTTON,
  TIMELINE_LUCENELANGUAGE_BUTTON,
  TIMELINE_KQLLANGUAGE_BUTTON,
  TIMELINE_QUERY,
  ESQL_TAB,
  NEW_TIMELINE_ACTION,
  SAVE_TIMELINE_ACTION,
  TOGGLE_DATA_PROVIDER_BTN,
  SAVE_TIMELINE_ACTION_BTN,
  TIMELINE_SEARCH_OR_FILTER,
  TIMELINE_KQLMODE_FILTER,
  TIMELINE_KQLMODE_SEARCH,
  TIMELINE_DATA_PROVIDERS_CONTAINER,
  ROW_ADD_NOTES_BUTTON,
  TIMELINE_PANEL,
  BOTTOM_BAR_TIMELINE_PLUS_ICON,
  BOTTOM_BAR_CREATE_NEW_TIMELINE,
  BOTTOM_BAR_CREATE_NEW_TIMELINE_TEMPLATE,
} from '../screens/timeline';

import { REFRESH_BUTTON, TIMELINE, TIMELINES_TAB_TEMPLATE } from '../screens/timelines';
import { drag, drop, waitForTabToBeLoaded } from './common';

import { closeFieldsBrowser, filterFieldsBrowser } from './fields_browser';

const hostExistsQuery = 'host.name: *';

export const addNameToTimelineAndSave = (name: string) => {
  cy.get(SAVE_TIMELINE_ACTION_BTN).first().click();
  cy.get(TIMELINE_TITLE_INPUT).should('not.be.disabled').clear();
  cy.get(TIMELINE_TITLE_INPUT).type(`${name}{enter}`);
  cy.get(TIMELINE_TITLE_INPUT).should('have.attr', 'value', name);
  cy.get(TIMELINE_SAVE_MODAL_SAVE_BUTTON).click();
  cy.get(TIMELINE_TITLE_INPUT).should('not.exist');
};

export const addNameToTimelineAndSaveAsNew = (name: string) => {
  cy.get(SAVE_TIMELINE_ACTION_BTN).first().click();
  cy.get(TIMELINE_TITLE_INPUT).should('not.be.disabled').clear();
  cy.get(TIMELINE_TITLE_INPUT).type(`${name}{enter}`);
  cy.get(TIMELINE_TITLE_INPUT).should('have.attr', 'value', name);
  cy.get(TIMELINE_SAVE_MODAL_SAVE_AS_NEW_SWITCH).should('exist');
  cy.get(TIMELINE_SAVE_MODAL_SAVE_AS_NEW_SWITCH).click();
  cy.get(TIMELINE_SAVE_MODAL_SAVE_BUTTON).click();
  cy.get(TIMELINE_TITLE_INPUT).should('not.exist');
};

export const addNameAndDescriptionToTimeline = (
  timeline: Timeline,
  modalAlreadyOpen: boolean = false
) => {
  if (!modalAlreadyOpen) {
    cy.get(SAVE_TIMELINE_ACTION).click();
  }
  cy.get(TIMELINE_TITLE_INPUT).type(`${timeline.title}{enter}`);
  cy.get(TIMELINE_TITLE_INPUT).should('have.attr', 'value', timeline.title);
  cy.get(TIMELINE_DESCRIPTION_INPUT).type(timeline.description);
  cy.get(TIMELINE_DESCRIPTION_INPUT).invoke('val').should('equal', timeline.description);
  cy.get(TIMELINE_SAVE_MODAL_SAVE_BUTTON).click();
  cy.get(TIMELINE_TITLE_INPUT).should('not.exist');
};

export const goToNotesTab = () => {
  cy.get(NOTES_TAB_BUTTON).click();
  cy.get(NOTES_TEXT_AREA).should('be.visible');
};

export const goToEsqlTab = () => waitForTabToBeLoaded(ESQL_TAB);

export const goToCorrelationTab = () => {
  cy.get(TIMELINE_CORRELATION_TAB).click();
  cy.get(`${TIMELINE_TAB_CONTENT_EQL} ${TIMELINE_CORRELATION_INPUT}`).should('be.visible');

  return cy.get(TIMELINE_CORRELATION_TAB);
};

export const goToQueryTab = () => {
  cy.get(QUERY_TAB_BUTTON).click();
  cy.get(QUERY_TAB_BUTTON).should('have.class', 'euiTab-isSelected');
};

export const addNotesToTimeline = (notes: string) => {
  goToNotesTab();

  cy.get(NOTES_TAB_BUTTON)
    .find('.euiBadge__text')
    .invoke('text')
    .then(parseInt)
    .then((notesCount) => {
      cy.get(NOTES_TEXT_AREA).type(notes, {
        parseSpecialCharSequences: false,
      });

      cy.get(ADD_NOTE_BUTTON).click();
      cy.get(ADD_NOTE_BUTTON).should('have.attr', 'disabled');

      cy.get(`${NOTES_TAB_BUTTON} .euiBadge`).should('have.text', `${notesCount + 1}`);
    });
};

export const addNoteToFirstRowEvent = (notes: string) => {
  cy.get(ROW_ADD_NOTES_BUTTON).first().click();
  cy.get(NOTES_TEXT_AREA).type(notes, {
    parseSpecialCharSequences: false,
  });

  cy.get(ADD_NOTE_BUTTON).click();
};

export const addEqlToTimeline = (eql: string) => {
  goToCorrelationTab().then(() => {
    cy.get(TIMELINE_CORRELATION_INPUT).type(eql);
    cy.get(EQL_QUERY_VALIDATION_SPINNER).should('not.exist');
  });
};

export const clearEqlInTimeline = () => {
  cy.get(TIMELINE_CORRELATION_INPUT).type('{selectAll} {del}');
  cy.get(TIMELINE_CORRELATION_INPUT).clear();
  cy.get(EQL_QUERY_VALIDATION_SPINNER).should('not.exist');
};

export const addFilter = (filter: TimelineFilter): Cypress.Chainable<JQuery<HTMLElement>> => {
  cy.get(ADD_FILTER).click();
  cy.get(TIMELINE_FILTER_FIELD).type(`${filter.field}{downarrow}{enter}`);
  cy.get(TIMELINE_FILTER_OPERATOR).type(`${filter.operator}{downarrow}{enter}`);
  if (filter.operator !== 'exists') {
    cy.get(TIMELINE_FILTER_VALUE).type(`${filter.value}{enter}`);
  }
  return cy.get(SAVE_FILTER_BTN).click();
};

export const changeTimelineQueryLanguage = (language: 'kuery' | 'lucene') => {
  cy.get(TIMELINE_SHOWQUERYBARMENU_BUTTON).click();
  cy.get(TIMELINE_SWITCHQUERYLANGUAGE_BUTTON).click();
  if (language === 'lucene') {
    cy.get(TIMELINE_LUCENELANGUAGE_BUTTON).click();
  } else {
    cy.get(TIMELINE_KQLLANGUAGE_BUTTON).click();
  }
};

export const addDataProvider = (filter: TimelineFilter): Cypress.Chainable<JQuery<HTMLElement>> => {
  cy.get(TOGGLE_DATA_PROVIDER_BTN).click();
  cy.get(TIMELINE_DATA_PROVIDERS_CONTAINER).should('be.visible'); // Cypress doesn't properly wait for the data provider to finish expanding, so we wait for the animation to finish.
  cy.get(TIMELINE_ADD_FIELD_BUTTON).click();
  cy.get(TIMELINE_DATA_PROVIDER_FIELD)
    .find(COMBO_BOX_INPUT)
    .type(`${filter.field}{downarrow}{enter}`);

  cy.get(TIMELINE_DATA_PROVIDER_OPERATOR)
    .find(`${COMBO_BOX_INPUT} input`)
    .type(`{selectall}{backspace}{selectall}{backspace}`);

  cy.get(TIMELINE_DATA_PROVIDER_OPERATOR)
    .find(COMBO_BOX_INPUT)
    .type(`${filter.operator}{downarrow}{enter}`);

  if (filter.operator !== 'exists') {
    cy.get(TIMELINE_DATA_PROVIDER_VALUE).type(`${filter.value}{enter}`);
  }
  return cy.get(SAVE_DATA_PROVIDER_BTN).click();
};

export const updateDataProviderbyDraggingField = (fieldName: string, rowNumber: number) => {
  const dragTargetSelector = GET_TIMELINE_GRID_CELL(fieldName);
  cy.get(dragTargetSelector)
    .eq(rowNumber)
    .then((currentSubject) => {
      drag(currentSubject);
    });
  let dropTarget: Cypress.Chainable<JQuery<HTMLElement>>;

  cy.get('body').then((body) => {
    if (body.find(EMPTY_DATA_PROVIDER_AREA).length > 0) {
      dropTarget = cy.get(EMPTY_DATA_PROVIDER_AREA);
    } else {
      dropTarget = cy.get(EMPTY_DROPPABLE_DATA_PROVIDER_GROUP);
    }

    dropTarget.then((currentEl) => {
      drop(currentEl);
    });
  });
};

export const updateDataProviderByFieldHoverAction = (fieldName: string, rowNumber: number) => {
  const fieldSelector = GET_TIMELINE_GRID_CELL(fieldName);
  cy.get(fieldSelector).eq(rowNumber).trigger('mouseover');
  cy.get(HOVER_ACTIONS.ADD_TO_TIMELINE).should('be.visible');
  recurse(
    () => {
      cy.get(HOVER_ACTIONS.ADD_TO_TIMELINE).click();
      return cy.root();
    },
    ($el) => $el.find(HOVER_ACTIONS.ADD_TO_TIMELINE).length === 0
  );
};

export const addNewCase = () => {
  cy.get(ALL_CASES_CREATE_NEW_CASE_TABLE_BTN).click();
};

export const attachTimelineToNewCase = () => {
  cy.get(ATTACH_TIMELINE_TO_CASE_BUTTON).click();
  cy.get(ATTACH_TIMELINE_TO_NEW_CASE_ICON).click();
};

export const attachTimelineToExistingCase = () => {
  cy.get(ATTACH_TIMELINE_TO_CASE_BUTTON).click();
  cy.get(ATTACH_TIMELINE_TO_EXISTING_CASE_ICON).click();
};

const clickIdHoverActionOverflowButton = () => {
  cy.get(ID_HOVER_ACTION_OVERFLOW_BTN).should('exist');

  cy.get(ID_HOVER_ACTION_OVERFLOW_BTN).click();
};

export const clickIdToggleField = () => {
  clickIdHoverActionOverflowButton();
  cy.get(ID_HEADER_FIELD).should('not.exist');

  cy.get(ID_TOGGLE_FIELD).click();
};

export const closeTimeline = () => {
  cy.get(CLOSE_TIMELINE_BTN).click();
  cy.get(QUERY_TAB_BUTTON).should('not.be.visible');
};

export const createNewTimeline = () => {
  openCreateTimelineOptionsPopover();
  cy.get(CREATE_NEW_TIMELINE).click();
};

export const openCreateTimelineOptionsPopover = () => {
  cy.get(NEW_TIMELINE_ACTION).filter(':visible').click();
};

export const createTimelineFromBottomBar = () => {
  recurse(
    () => {
      cy.get(BOTTOM_BAR_TIMELINE_PLUS_ICON).filter(':visible').click();
      return cy.get(BOTTOM_BAR_CREATE_NEW_TIMELINE);
    },
    (sub) => sub.is(':visible')
  );

  cy.get(BOTTOM_BAR_CREATE_NEW_TIMELINE).click();
};

export const createTimelineTemplateFromBottomBar = () => {
  recurse(
    () => {
      cy.get(BOTTOM_BAR_TIMELINE_PLUS_ICON).filter(':visible').click();
      return cy.get(BOTTOM_BAR_CREATE_NEW_TIMELINE_TEMPLATE).eq(0);
    },
    (sub) => sub.is(':visible')
  );

  cy.get(BOTTOM_BAR_CREATE_NEW_TIMELINE_TEMPLATE).eq(0).click();
};

export const executeTimelineKQL = (query: string) => {
  cy.get(`${SEARCH_OR_FILTER_CONTAINER} textarea`).clear();
  cy.get(`${SEARCH_OR_FILTER_CONTAINER} textarea`).type(`${query} {enter}`);
};

export const executeTimelineSearch = (query: string) => {
  cy.get(TIMELINE_QUERY).type(`${query} {enter}`);
};

export const expandFirstTimelineEventDetails = () => {
  cy.get(TOGGLE_TIMELINE_EXPAND_EVENT).first().click();
};

/**
 * Saves the timeline. Make sure that the timeline has a title set
 * before you're using this task. Otherwise it will fail to save.
 */
export const saveTimeline = () => {
  cy.get(SAVE_TIMELINE_ACTION_BTN).first().click();

  cy.get(TIMELINE_SAVE_MODAL).within(() => {
    cy.get(TIMELINE_PROGRESS_BAR).should('not.exist');
    cy.get(TIMELINE_TITLE_INPUT).should('not.be.disabled');

    cy.get(TIMELINE_SAVE_MODAL_SAVE_BUTTON).should('not.be.disabled');
    cy.get(TIMELINE_SAVE_MODAL_SAVE_BUTTON).click();

    cy.get(TIMELINE_PROGRESS_BAR).should('exist');
    cy.get(TIMELINE_PROGRESS_BAR).should('not.exist');
  });
};

export const markAsFavorite = () => {
  cy.intercept('PATCH', 'api/timeline/_favorite').as('markedAsFavourite');
  cy.get(TIMELINE_PANEL).within(() => cy.get(STAR_ICON).click());
  cy.wait('@markedAsFavourite');
};

export const openTimelineFieldsBrowser = () => {
  cy.get(TIMELINE_FIELDS_BUTTON).first().click();
};

export const openTimelineInspectButton = () => {
  cy.get(TIMELINE_INSPECT_BUTTON).should('not.be.disabled');
  cy.get(TIMELINE_INSPECT_BUTTON).click();
};

export const openTimelineFromSettings = () => {
  cy.get(OPEN_TIMELINE_ICON).click();
};

export const openTimelineTemplate = (id: string) => {
  cy.get(TIMELINE_TITLE_BY_ID(id)).click();
};

export const openTimelineTemplatesTab = () => {
  cy.get(TIMELINES_TAB_TEMPLATE).click();
};

export const openTimelineById = (timelineId: string): Cypress.Chainable<JQuery<HTMLElement>> => {
  if (timelineId == null) {
    // Log out if for some reason this happens to be null just in case for our tests we experience
    // value of null. Some tests return an "any" which is why this could happen.
    cy.log('"timelineId" is null or undefined');
  }
  // We avoid use cypress.pipe() here and multiple clicks because each of these clicks
  // can result in a new URL async operation occurring and then we get indeterminism as the URL loads multiple times.
  return cy.get(TIMELINE_TITLE_BY_ID(timelineId)).click();
};

export const openActiveTimeline = () => {
  cy.get(ACTIVE_TIMELINE_BOTTOM_BAR).click();
};

export const pinFirstEvent = (): Cypress.Chainable<JQuery<HTMLElement>> => {
  return cy.get(PIN_EVENT).first().click();
};

export const populateTimeline = () => {
  executeTimelineKQL(hostExistsQuery);
  cy.get(SERVER_SIDE_EVENT_COUNT).should('not.have.text', '0');
};

const clickTimestampHoverActionOverflowButton = () => {
  cy.get(TIMESTAMP_HOVER_ACTION_OVERFLOW_BTN).should('exist');

  cy.get(TIMESTAMP_HOVER_ACTION_OVERFLOW_BTN).click();
};

export const clickTimestampToggleField = () => {
  clickTimestampHoverActionOverflowButton();

  cy.get(TIMESTAMP_TOGGLE_FIELD).should('exist');

  cy.get(TIMESTAMP_TOGGLE_FIELD).click();
};

export const removeColumn = (columnName: string) => {
  cy.get(FIELD_BROWSER).first().click();
  filterFieldsBrowser(columnName);
  cy.get(FIELDS_BROWSER_CHECKBOX(columnName)).click();
  closeFieldsBrowser();
};

export const resetFields = () => {
  cy.get(RESET_FIELDS).click();
};

export const selectCase = (caseId: string) => {
  cy.get(SELECT_CASE(caseId)).click();
};

/**
 * We keep clicking on the refresh button until we have the timeline we are looking
 * for. NOTE: That because refresh happens so fast, the click handler in most cases
 * is not on it reliably. You should not use a pipe off of this to get your timeline
 * clicked as a pipe off the timeline link can product multiple URL loads which will
 * add a different type of flake to your tests. You will usually have to use wait() for
 * this like so:
 *
 * refreshTimelinesUntilTimeLinePresent(timelineId)
 *   // This wait is here because we cannot do a pipe on a timeline as that will introduce multiple URL
 *   // request responses and indeterminism.
 *   .then(() => cy.wait(1000))
 *   .then(() => ... your code here ...)
 * @param id The timeline id to click the refresh button until we find it.
 */
export const refreshTimelinesUntilTimeLinePresent = (
  id: string
): Cypress.Chainable<JQuery<HTMLHtmlElement>> => {
  cy.get(REFRESH_BUTTON).click();
  cy.get(TIMELINE(id)).should('be.visible');
  return cy.get(TIMELINE(id));
};

export const clickingOnCreateTimelineFormTemplateBtn = () => {
  cy.get(TIMELINE_CREATE_TIMELINE_FROM_TEMPLATE_BTN).click();
};

export const clickingOnCreateTemplateFromTimelineBtn = () => {
  cy.get(TIMELINE_CREATE_TEMPLATE_FROM_TIMELINE_BTN).click();
};

export const expandEventAction = () => {
  cy.waitUntil(() => {
    cy.get(TIMELINE_COLLAPSED_ITEMS_BTN).should('exist');
    cy.get(TIMELINE_COLLAPSED_ITEMS_BTN).should('be.visible');
    return cy.get(TIMELINE_COLLAPSED_ITEMS_BTN).then(($el) => $el.length >= 1);
  });
  cy.get(TIMELINE_COLLAPSED_ITEMS_BTN).first().click();
};

const showDataProviderQueryBuilder = () => {
  cy.get(TOGGLE_DATA_PROVIDER_BTN).should('have.attr', 'aria-pressed', 'false');
  cy.get(TOGGLE_DATA_PROVIDER_BTN).click();
  cy.get(TOGGLE_DATA_PROVIDER_BTN).should('have.attr', 'aria-pressed', 'true');
};

export const selectKqlFilterMode = () => {
  showDataProviderQueryBuilder();
  cy.get(TIMELINE_SEARCH_OR_FILTER).click();
  cy.get(TIMELINE_KQLMODE_FILTER).click();
};

export const selectKqlSearchMode = () => {
  showDataProviderQueryBuilder();
  cy.get(TIMELINE_SEARCH_OR_FILTER).click();
  cy.get(TIMELINE_KQLMODE_SEARCH).click();
};
