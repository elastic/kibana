/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InspectLensVisualizationsMetadata, InspectTableMetadata } from '../screens/inspect';
import {
  EMBEDDABLE_PANEL_INSPECT,
  EMBEDDABLE_PANEL_TOGGLE_ICON,
  INSPECT_BUTTON_ICON,
} from '../screens/inspect';

export const closesModal = () => {
  cy.get('[data-test-subj="modal-inspect-close"]').click();
};

export const clickInspectButton = (container: string) => {
  cy.get(container).realHover();
  cy.get(container).find(INSPECT_BUTTON_ICON).click({ force: true });
};

const LOADER_ARIA = '[aria-label="Loading"]';
const TABLE_LOADER = `[data-test-subj="initialLoadingPanelPaginatedTable"],${LOADER_ARIA}`;

export const openTableInspectModal = (table: InspectTableMetadata) => {
  // wait for table to load
  cy.get(table.id).then(($table) => {
    if ($table.find(TABLE_LOADER).length > 0) {
      cy.get(TABLE_LOADER).should('not.exist');
    }
  });

  clickInspectButton(table.altInspectId ?? table.id);
};

export const openLensVisualizationsInspectModal = (
  { panelSelector, embeddableId, tab }: InspectLensVisualizationsMetadata,
  onOpen: () => void
) => {
  cy.get(panelSelector)
    .get(`[data-test-embeddable-id="${embeddableId}"]`)
    .each(($el) => {
      // wait for visualization to load
      if ($el.find(LOADER_ARIA).length > 0) {
        cy.get(LOADER_ARIA).should('not.exist');
      }

      cy.wrap($el).find(EMBEDDABLE_PANEL_TOGGLE_ICON).click();
      cy.get(EMBEDDABLE_PANEL_INSPECT).click();

      onOpen();

      closesModal();
    });
};

export const openTab = (tab: string) => {
  cy.get(tab).click();
};
