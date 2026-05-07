/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EXPAND_ROW_BUTTON,
  dataGridRowCellByColumn,
} from '../../screens/entity_analytics/entity_analytics_home';
import {
  ADD_ENTITIES_ACCORDION,
  ADD_ENTITIES_SEARCH,
  ADD_ENTITIES_TABLE,
  ADD_ENTITY_BUTTON_ARIA,
  CONFIRM_RESOLUTION_MODAL,
  CONFIRM_MODAL_RADIO_NEW_AS_TARGET,
  EUI_BASIC_TABLE_ROW,
  EUI_TABLE_PAGINATION_PAGE_SIZE_BUTTON,
  EUI_TABLE_PAGINATION_PAGE_SIZE_OPTION,
  REMOVE_ENTITY_BUTTON_ARIA,
  RESOLUTION_GROUP_LINK,
  RESOLUTION_GROUP_TAB,
  RESOLUTION_GROUP_TAB_CONTENT,
  RESOLUTION_GROUP_TABLE,
  RESOLUTION_SECTION,
} from '../../screens/entity_analytics/entity_flyout_resolution';

const RESOLUTION_GROUP_API = '/api/security/entity_store/resolution/group';
const RESOLUTION_LINK_API = '/api/security/entity_store/resolution/link';
const RESOLUTION_UNLINK_API = '/api/security/entity_store/resolution/unlink';
const ENTITIES_LIST_API = '/api/security/entity_store/entities';

/**
 * Aliases the resolution-group GET endpoint so tests can wait for the right-panel
 * ResolutionSection to finish loading before asserting on the rendered group.
 */
export const interceptResolutionGroup = () => {
  cy.intercept('GET', `${RESOLUTION_GROUP_API}*`).as('resolutionGroup');
};

/**
 * Aliases the link / unlink mutations and the search list endpoint so tests
 * can wait deterministically for the post-action server roundtrip.
 */
export const interceptResolutionMutations = () => {
  cy.intercept('POST', RESOLUTION_LINK_API).as('resolutionLink');
  cy.intercept('POST', RESOLUTION_UNLINK_API).as('resolutionUnlink');
  cy.intercept('GET', `${ENTITIES_LIST_API}*`).as('entitiesList');
};

/**
 * Click the row-expand button on the entity-analytics flat data grid for the
 * row whose `entity.name` cell matches `entityName`. Targets the row via
 * a non-positional selector chain: name cell → containing role=row → expand button.
 */
export const openEntityFlyoutFromHomeByName = (entityName: string) => {
  cy.contains(dataGridRowCellByColumn('entity.name'), entityName)
    .parents('[role="row"]')
    .find(EXPAND_ROW_BUTTON)
    .click();
};

/**
 * Click the "Resolution group" link inside the right-panel ResolutionSection
 * to open the left panel pre-selected on the resolution tab. Waits for the
 * tab content to render before returning so chained interactions are safe.
 */
export const openResolutionTabFromRightPanel = () => {
  cy.get(RESOLUTION_SECTION).should('be.visible');
  cy.get(RESOLUTION_GROUP_LINK).click();
  cy.get(RESOLUTION_GROUP_TAB).should('be.visible');
  cy.get(RESOLUTION_GROUP_TAB_CONTENT).should('be.visible');
};

/**
 * Expand the "Add entities" accordion. The accordion is collapsed by default
 * in the redesigned UX; the section contents become visible once expanded.
 * Targets the EuiAccordion toggle by its stable `.euiAccordion__button` class
 * to avoid positional selectors.
 */
export const expandAddEntitiesAccordion = () => {
  cy.get(ADD_ENTITIES_ACCORDION).find('.euiAccordion__button').click();
  cy.get(ADD_ENTITIES_SEARCH).should('be.visible');
};

/**
 * Type a query into the add-entities search field. The field is debounced
 * (~300ms in production), so callers should wait for `@entitiesList` before
 * asserting on results.
 */
export const searchForEntity = (query: string) => {
  cy.get(ADD_ENTITIES_SEARCH).clear();
  cy.get(ADD_ENTITIES_SEARCH).type(query);
};

/**
 * Click the add (plus) button on the search-results row whose Entity name
 * cell contains `entityName`. Targets via aria-label so the assertion is
 * non-positional and survives column reordering.
 */
export const clickAddOnSearchRow = (entityName: string) => {
  cy.get(ADD_ENTITIES_TABLE)
    .find(EUI_BASIC_TABLE_ROW)
    .contains(EUI_BASIC_TABLE_ROW, entityName)
    .find(`button[aria-label="${ADD_ENTITY_BUTTON_ARIA}"]`)
    .click();
};

/**
 * Click the remove (cross) button on the group-table row whose Entity name
 * cell contains `entityName`. The button is disabled for the primary entity
 * (tooltip "Cannot remove primary entity"); the spec asserts that separately.
 */
export const clickRemoveOnGroupRow = (entityName: string) => {
  cy.get(RESOLUTION_GROUP_TABLE)
    .find(EUI_BASIC_TABLE_ROW)
    .contains(EUI_BASIC_TABLE_ROW, entityName)
    .find(`button[aria-label="${REMOVE_ENTITY_BUTTON_ARIA}"]`)
    .click();
};

/** The two radio choices in the ConfirmResolutionModal. */
export type ResolutionPrimaryChoice = 'current_as_target' | 'new_as_target';

/**
 * Confirm the resolution modal with the given primary choice. The modal
 * defaults to "current entity becomes the primary"; when `choice` is
 * `'new_as_target'`, the swap radio is selected before confirming.
 */
export const confirmInResolutionModal = (choice: ResolutionPrimaryChoice) => {
  cy.get(CONFIRM_RESOLUTION_MODAL).should('be.visible');
  if (choice === 'new_as_target') {
    // EuiRadio visually hides the input behind a label; clicking the label is
    // the user-facing interaction and avoids the `cypress/no-force` rule.
    cy.get('label[for="new_as_target"]').click();
    cy.get(CONFIRM_MODAL_RADIO_NEW_AS_TARGET).should('be.checked');
  }
  cy.get(CONFIRM_RESOLUTION_MODAL).find('button').contains('Confirm resolution').click();
};

/**
 * Open the EuiBasicTable page-size popover for the add-entities table and
 * choose `size` rows-per-page. Asserts the popover opens before clicking
 * to avoid a race against the popover-anchor focus management.
 */
export const changeAddEntitiesPageSize = (size: 10 | 25 | 50) => {
  cy.get(ADD_ENTITIES_TABLE).find(EUI_TABLE_PAGINATION_PAGE_SIZE_BUTTON).click();
  cy.get(EUI_TABLE_PAGINATION_PAGE_SIZE_OPTION(size)).click();
};
